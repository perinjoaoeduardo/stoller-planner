"use server";

import { revalidatePath } from "next/cache";

import {
  canEditPlan,
  getCurrentProfile,
  requireChannelAccess,
} from "@/lib/auth/scope";
import { registerExecution } from "@/lib/actions/execution";
import {
  INBOX_PHOTO_BUCKET,
  PHOTO_BUCKET,
  photoStoragePath,
} from "@/lib/photos";
import { getAtividadesDoCanal, getMetasDoCanal } from "@/lib/db/inbox";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Triagem da caixa de entrada: transformar registro cru em atividade.
 *
 * NÃO existe fluxo novo aqui. Vincular e criar são o `registerExecution`
 * que já existe, chamado com o canal travado e as fotos já anexadas. O
 * que este módulo faz de próprio é o que só a triagem precisa: mover a
 * foto do bucket da caixa para o de evidência e fechar o registro.
 */

const GENERIC_ERROR = "Não foi possível resolver. Tente de novo.";
const JA_RESOLVIDO =
  "Este registro já foi resolvido por outra pessoa. A lista foi atualizada.";

function revalidateInbox() {
  revalidatePath("/caixa-de-entrada");
  // O badge do menu vive no layout; a linha de aviso, na home.
  revalidatePath("/", "layout");
}

/**
 * Move as fotos do bucket da caixa (privado) para o de evidência.
 *
 * MOVE, não copia: o objeto não pode existir em dois lugares, senão
 * passam a existir duas verdades sobre a mesma foto e a deleção da
 * atividade deixa órfão no outro bucket. Uma falha de remoção não
 * derruba a triagem — a evidência já está no lugar certo, e sobrar um
 * arquivo é menos grave do que perder o registro do trabalho.
 */
async function moverFotosParaEvidencia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caminhos: string[]
): Promise<string[] | null> {
  const destinos: string[] = [];

  for (const origem of caminhos) {
    const { data: arquivo, error: erroDownload } = await supabase.storage
      .from(INBOX_PHOTO_BUCKET)
      .download(origem);
    if (erroDownload || !arquivo) return null;

    const extensao = origem.split(".").pop() ?? "jpg";
    const destino = photoStoragePath("caixa-de-entrada", extensao);

    const { error: erroUpload } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(destino, arquivo, { contentType: arquivo.type || "image/jpeg" });
    if (erroUpload) return null;

    destinos.push(destino);
  }

  await supabase.storage.from(INBOX_PHOTO_BUCKET).remove(caminhos);
  return destinos;
}

type RegistroParaTriagem = {
  id: string;
  autor_id: string;
  canal_id: string;
  filial_id: string | null;
  fotos: string[];
  descricao: string | null;
  titulo: string | null;
  tipo_acao: string | null;
  meta_id: string | null;
  status: string;
};

async function carregarPendentes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<RegistroParaTriagem[] | null> {
  const { data, error } = await supabase
    .from("inbox_registros")
    .select(
      "id, autor_id, canal_id, filial_id, fotos, descricao, titulo, tipo_acao, meta_id, status"
    )
    .in("id", ids)
    .eq("status", "pendente");

  if (error) return null;
  return (data ?? []) as RegistroParaTriagem[];
}

/**
 * Fecha o registro como resolvido. O update é CONDICIONADO a
 * `status = 'pendente'`: duas pessoas triando o mesmo registro não
 * podem gerar duas atividades — a segunda descobre que perdeu a corrida.
 */
async function fecharRegistros(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
  atividadeId: string | null,
  quemResolveu: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("inbox_registros")
    .update({
      status: "registrado",
      atividade_id: atividadeId,
      resolvido_em: new Date().toISOString(),
      resolvido_por: quemResolveu,
    })
    .in("id", ids)
    .eq("status", "pendente")
    .select("id");

  if (error) return false;
  return (data ?? []).length === ids.length;
}

/**
 * Vincula um ou mais registros a uma atividade que já existe: as fotos
 * viram evidência dela e a execução fica registrada.
 *
 * O EXECUTOR é o autor do registro, não quem triou — quem esteve em
 * campo foi ele. Quem triou fica em `resolvido_por`.
 */
export async function vincularRegistros(input: {
  registroIds: string[];
  activityId: string;
}): Promise<ActionResult & { activityId?: string }> {
  if (input.registroIds.length === 0) {
    return { ok: false, error: "Nenhum registro selecionado." };
  }

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const registros = await carregarPendentes(supabase, input.registroIds);
  if (!registros) return { ok: false, error: GENERIC_ERROR };
  if (registros.length !== input.registroIds.length) {
    return { ok: false, error: JA_RESOLVIDO };
  }

  // Um registro só pertence a um canal; o lote inteiro tem de ser do
  // mesmo, senão a atividade herdaria foto de outro canal.
  const canais = new Set(registros.map((registro) => registro.canal_id));
  if (canais.size > 1) {
    return { ok: false, error: "Os registros são de canais diferentes." };
  }
  const canalId = [...canais][0];
  if (!(await requireChannelAccess(canalId))) {
    return { ok: false, error: "Você não tem acesso a este canal." };
  }

  const fotos = registros.flatMap((registro) => registro.fotos);
  const movidas = await moverFotosParaEvidencia(supabase, fotos);
  if (!movidas) return { ok: false, error: GENERIC_ERROR };

  // A descrição que veio do campo entra na descrição da EXECUÇÃO. Nunca
  // sobrescreve o título da atividade: o plano é quem nomeia.
  const descricao = registros
    .map((registro) => registro.descricao)
    .filter(Boolean)
    .join(" ");

  const resultado = await registerExecution({
    activityId: input.activityId,
    description: descricao,
    markCompleted: true,
    photoPaths: movidas,
    executorProfileId: registros[0].autor_id,
  });

  if (!resultado.ok) return { ok: false, error: resultado.error };

  const fechou = await fecharRegistros(
    supabase,
    input.registroIds,
    input.activityId,
    profile.id
  );
  if (!fechou) return { ok: false, error: JA_RESOLVIDO };

  revalidateInbox();
  return { ok: true, activityId: input.activityId };
}

/**
 * Cria uma atividade nova a partir de um ou mais registros — o mesmo
 * caminho de "ação fora do plano", com canal travado e fotos anexadas.
 */
export async function criarAtividadeDeRegistros(input: {
  registroIds: string[];
  titulo: string;
  descricao: string;
  tipoAcao: string;
  metaId: string | null;
}): Promise<ActionResult & { activityId?: string }> {
  if (input.registroIds.length === 0) {
    return { ok: false, error: "Nenhum registro selecionado." };
  }

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const registros = await carregarPendentes(supabase, input.registroIds);
  if (!registros) return { ok: false, error: GENERIC_ERROR };
  if (registros.length !== input.registroIds.length) {
    return { ok: false, error: JA_RESOLVIDO };
  }

  const canais = new Set(registros.map((registro) => registro.canal_id));
  if (canais.size > 1) {
    return { ok: false, error: "Os registros são de canais diferentes." };
  }
  const canalId = [...canais][0];
  if (!(await requireChannelAccess(canalId))) {
    return { ok: false, error: "Você não tem acesso a este canal." };
  }

  const fotos = registros.flatMap((registro) => registro.fotos);
  const movidas = await moverFotosParaEvidencia(supabase, fotos);
  if (!movidas) return { ok: false, error: GENERIC_ERROR };

  // Filial só quando o lote inteiro veio da mesma — misturar filiais
  // numa atividade só apagaria de onde a evidência veio.
  const filiais = new Set(registros.map((registro) => registro.filial_id));
  const filialId = filiais.size === 1 ? [...filiais][0] : null;

  const resultado = await registerExecution({
    adhocChannelId: filialId ? undefined : canalId,
    adhocBranchId: filialId ?? undefined,
    description: input.descricao,
    title: input.titulo,
    category: input.tipoAcao as never,
    problemId: input.metaId,
    markCompleted: true,
    photoPaths: movidas,
    executorProfileId: registros[0].autor_id,
  });

  if (!resultado.ok) return { ok: false, error: resultado.error };

  const fechou = await fecharRegistros(
    supabase,
    input.registroIds,
    resultado.activityId ?? null,
    profile.id
  );
  if (!fechou) return { ok: false, error: JA_RESOLVIDO };

  revalidateInbox();
  return { ok: true, activityId: resultado.activityId };
}

/**
 * Descarta sem diálogo de confirmação: a ação é reversível e o toast
 * com Desfazer cobre o erro melhor e mais rápido do que uma pergunta
 * antes de toda vez.
 */
export async function descartarRegistros(input: {
  registroIds: string[];
}): Promise<ActionResult> {
  if (input.registroIds.length === 0) return { ok: true };

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const registros = await carregarPendentes(supabase, input.registroIds);
  if (!registros) return { ok: false, error: GENERIC_ERROR };
  if (registros.length === 0) return { ok: false, error: JA_RESOLVIDO };

  for (const registro of registros) {
    const podeMexer =
      registro.autor_id === profile.id ||
      (await canEditPlan(profile, registro.canal_id));
    if (!podeMexer) {
      return { ok: false, error: "Você não pode descartar este registro." };
    }
  }

  const { error } = await supabase
    .from("inbox_registros")
    .update({
      status: "descartado",
      resolvido_em: new Date().toISOString(),
      resolvido_por: profile.id,
    })
    .in("id", input.registroIds)
    .eq("status", "pendente");

  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateInbox();
  return { ok: true };
}

/**
 * Desfaz o descarte. Só volta o que está descartado: registro que virou
 * atividade não pode voltar para a fila, senão a mesma execução seria
 * lançada duas vezes.
 */
export async function restaurarRegistros(input: {
  registroIds: string[];
}): Promise<ActionResult> {
  if (input.registroIds.length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_registros")
    .update({
      status: "pendente",
      resolvido_em: null,
      resolvido_por: null,
    })
    .in("id", input.registroIds)
    .eq("status", "descartado");

  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateInbox();
  return { ok: true };
}

/**
 * Leituras que a triagem faz do lado do cliente (drawer de vincular e
 * diálogo de criar). Vivem como action porque o componente é client e
 * as consultas são server-only — a regra de escopo continua no servidor.
 */
export async function listarAtividadesDoCanal(channelId: string) {
  if (!(await requireChannelAccess(channelId))) return [];
  return getAtividadesDoCanal(channelId);
}

export async function listarMetasDoCanal(channelId: string) {
  if (!(await requireChannelAccess(channelId))) return [];
  return getMetasDoCanal(channelId);
}
