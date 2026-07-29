"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile, requireChannelAccess } from "@/lib/auth/scope";
import {
  INBOX_PHOTO_BUCKET,
  PHOTO_BUCKET,
  photoStoragePath,
} from "@/lib/photos";
import {
  getAtividadesAbertasDoCanal,
  getMetasDoCanal,
} from "@/lib/db/inbox";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Envios do campo — a única coisa que este módulo faz é PENDURAR um
 * registro numa atividade.
 *
 * Quem CRIA a atividade (ou conclui a que já estava planejada) continua
 * sendo o `registerExecution` de sempre, chamado pela tela de
 * registro. Duplicar aquela lógica aqui dentro daria duas maneiras de a
 * mesma execução entrar no banco.
 *
 * O que só a caixa de entrada precisa é isto: a foto chegou num bucket
 * privado de espera e tem de virar evidência da atividade, e o registro
 * tem de parar de pedir decisão.
 */

const GENERIC_ERROR = "Não foi possível resolver. Tente de novo.";
const FOTO_SUMIU =
  "A foto deste registro não está mais no armazenamento. Peça o reenvio.";
const JA_RESOLVIDO =
  "Este registro já foi resolvido por outra pessoa. A lista foi atualizada.";

function revalidateInbox() {
  revalidatePath("/caixa-de-entrada");
  // O badge do menu vive no layout.
  revalidatePath("/", "layout");
}

/**
 * Move as fotos do bucket da caixa (privado) para o de evidência.
 *
 * MOVE, não copia: o objeto não pode existir em dois lugares, senão
 * passam a existir duas verdades sobre a mesma foto e a deleção da
 * atividade deixa órfão no outro bucket. Uma falha de remoção não
 * derruba a operação — a evidência já está no lugar certo, e sobrar um
 * arquivo é menos grave do que perder o registro do trabalho.
 */
async function moverFotosParaEvidencia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caminhos: string[]
): Promise<string[] | "sem-arquivo" | null> {
  const destinos: string[] = [];

  for (const origem of caminhos) {
    const { data: arquivo, error: erroDownload } = await supabase.storage
      .from(INBOX_PHOTO_BUCKET)
      .download(origem);
    // Arquivo ausente não é falha temporária: "tente de novo" seria
    // mentira, porque tentar de novo nunca vai funcionar.
    if (erroDownload || !arquivo) return "sem-arquivo";

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

/**
 * Pendura o registro na atividade que a tela acabou de criar ou
 * concluir: as fotos viram evidência dela e o registro para de pedir
 * decisão.
 *
 * Roda DEPOIS do `registerExecution`, não no lugar dele. Assim a
 * execução entra no banco pelo mesmo caminho de sempre, e os envios do campo só
 * acrescentam o que é deles.
 */
export async function anexarRegistroAAtividade(input: {
  registroId: string;
  activityId: string;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: registro, error: erroLeitura } = await supabase
    .from("inbox_registros")
    .select("id, canal_id, fotos, status")
    .eq("id", input.registroId)
    .eq("status", "pendente")
    .maybeSingle();

  if (erroLeitura) return { ok: false, error: GENERIC_ERROR };
  if (!registro) return { ok: false, error: JA_RESOLVIDO };
  if (!(await requireChannelAccess(registro.canal_id))) {
    return { ok: false, error: "Você não tem acesso a este canal." };
  }

  const movidas = await moverFotosParaEvidencia(supabase, registro.fotos);
  if (movidas === "sem-arquivo") return { ok: false, error: FOTO_SUMIU };
  if (!movidas) return { ok: false, error: GENERIC_ERROR };

  if (movidas.length > 0) {
    const { error } = await supabase.from("activity_photos").insert(
      movidas.map((path) => ({
        activity_id: input.activityId,
        storage_path: path,
        caption: null,
      }))
    );
    if (error) return { ok: false, error: GENERIC_ERROR };
  }

  // Condicionado a `status = 'pendente'`: duas abas triando o mesmo
  // registro não podem pendurá-lo em duas atividades — a segunda
  // descobre que perdeu a corrida.
  const { data: fechado, error: erroFecho } = await supabase
    .from("inbox_registros")
    .update({
      status: "registrado",
      atividade_id: input.activityId,
      resolvido_em: new Date().toISOString(),
      resolvido_por: profile.id,
      // O arquivo MUDOU de bucket: sem atualizar o caminho, o registro
      // ficaria no feed apontando para uma foto que não existe mais.
      fotos: movidas,
    })
    .eq("id", input.registroId)
    .eq("status", "pendente")
    .select("id");

  if (erroFecho) return { ok: false, error: GENERIC_ERROR };
  if ((fechado ?? []).length === 0) return { ok: false, error: JA_RESOLVIDO };

  revalidateInbox();
  return { ok: true };
}

/**
 * Leituras que a tela de registro faz do lado do cliente. Vivem
 * como action porque o drawer é client e as consultas são server-only —
 * a regra de escopo continua no servidor.
 */
export async function listarAtividadesAbertas(channelId: string) {
  if (!(await requireChannelAccess(channelId))) return [];
  return getAtividadesAbertasDoCanal(channelId);
}

export async function listarMetas(channelId: string) {
  if (!(await requireChannelAccess(channelId))) return [];
  return getMetasDoCanal(channelId);
}
