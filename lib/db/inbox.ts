import type { CurrentProfile } from "@/lib/auth/scope";
import type { ActivityStatus } from "@/components/shared/status-badge";
import type { ActivityCategory } from "@/lib/config";
import { getDisplayStatus } from "@/lib/db/status";
import {
  INBOX_PHOTO_BUCKET,
  INBOX_SIGNED_URL_TTL,
  publicPhotoUrl,
} from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

/**
 * Envios do campo — o que chegou pelo WhatsApp e ainda não virou
 * atividade.
 *
 * É um FEED do que veio do campo, em ordem de chegada — não uma fila que
 * se esvazia. Registro resolvido NÃO some: ele fica mostrando o que foi
 * feito e qual atividade virou. Sumir apagava a prova do trabalho da
 * pessoa justo na tela onde ela acabou de registrá-lo.
 *
 * Só `descartado` fica de fora: aquilo é lixo, e lixo não é histórico.
 *
 * Sem agrupamento por canal: quem envia é a pessoa, uma foto de cada vez,
 * e a pergunta ao abrir é "o que chegou desde a última vez que olhei".
 * Agrupar por canal respondia "quanto tem em cada canal", que é pergunta
 * de relatório, e fazia o envio novo aparecer no meio da tela se o canal
 * dele fosse antigo.
 *
 * As fotos vivem em bucket PRIVADO, então toda leitura assina as URLs
 * aqui, no servidor. O componente nunca monta URL de foto.
 */

export type InboxRegistro = {
  id: string;
  /** `pendente` pede decisão; `registrado` só mostra o que foi feito. */
  status: "pendente" | "registrado";
  atividadeId: string | null;
  atividadeTitulo: string | null;
  autorId: string;
  autorNome: string;
  autorAvatarUrl: string | null;
  canalId: string;
  canalNome: string;
  /** A filial vira `adhocBranchId` quando o envio nasce fora do plano. */
  filialId: string | null;
  filialNome: string | null;
  /** URLs já assinadas, na ordem em que chegaram. */
  fotos: string[];
  origem: string;
  tipoAcao: ActivityCategory | null;
  titulo: string | null;
  descricao: string | null;
  metaId: string | null;
  metaTitulo: string | null;
  recebidoEm: string;
};

type Row = {
  id: string;
  status: string;
  atividade_id: string | null;
  autor_id: string;
  canal_id: string;
  fotos: string[];
  origem: string;
  tipo_acao: string | null;
  titulo: string | null;
  descricao: string | null;
  meta_id: string | null;
  recebido_em: string;
  autor: { id: string; full_name: string; avatar_url: string | null } | null;
  canal: { id: string; name: string } | null;
  filial: { id: string; name: string } | null;
  meta: { title: string } | null;
  atividade: { id: string; title: string } | null;
};

/**
 * Assina em lote os caminhos de foto. Uma chamada por registro seria
 * uma ida ao storage por linha da fila.
 */
async function signPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const { data, error } = await supabase.storage
    .from(INBOX_PHOTO_BUCKET)
    .createSignedUrls(paths, INBOX_SIGNED_URL_TTL);

  if (error) return map;

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

/**
 * O feed inteiro: primeiro o que ainda PEDE DECISÃO, depois o que já
 * virou atividade. Dentro de cada grupo, ordem de chegada.
 *
 * Ordem de chegada pura enterrava o trabalho: bastavam cinco envios já
 * resolvidos para o primeiro que precisa de alguém cair abaixo da dobra,
 * e a tela abria como um mural de "feito" em vez de uma caixa de
 * entrada. É a mesma regra da lista de atividades — atrasada antes de
 * concluída — porque o que cobra ação vem antes do que só registra.
 */
export async function getInboxRegistros(
  profile: CurrentProfile,
  channelIds: string[]
): Promise<InboxRegistro[]> {
  if (channelIds.length === 0) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inbox_registros")
    .select(
      `id, status, atividade_id, autor_id, canal_id, fotos, origem, tipo_acao,
       titulo, descricao, meta_id, recebido_em,
       autor:profiles!inbox_registros_autor_id_fkey(id, full_name, avatar_url),
       canal:channels(id, name),
       filial:branches(id, name),
       meta:problems(title),
       atividade:activities(id, title)`
    )
    .in("status", ["pendente", "registrado"])
    .eq("autor_id", profile.id)
    .in("canal_id", channelIds)
    .order("recebido_em", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];

  // Cada estado guarda a foto num lugar diferente: pendente no bucket
  // PRIVADO da caixa (precisa de URL assinada), registrado no bucket
  // público de evidência, porque a triagem move o arquivo para lá.
  const signed = await signPhotos(
    supabase,
    rows.filter((row) => row.status === "pendente").flatMap((row) => row.fotos)
  );
  const urlDaFoto = (row: Row, path: string) =>
    row.status === "registrado" ? publicPhotoUrl(path) : signed.get(path) ?? "";

  // A query já vem ordenada por `recebido_em` desc; aqui só o pendente
  // sobe para a frente. Ordenação ESTÁVEL, então a data se preserva
  // dentro de cada grupo.
  const porStatus = [...rows].sort((a, b) => {
    const peso = (row: Row) => (row.status === "pendente" ? 0 : 1);
    return peso(a) - peso(b);
  });

  return porStatus.map((row) => ({
    id: row.id,
    status: row.status === "registrado" ? ("registrado" as const) : ("pendente" as const),
    atividadeId: row.atividade?.id ?? row.atividade_id,
    atividadeTitulo: row.atividade?.title ?? null,
    autorId: row.autor_id,
    autorNome: row.autor?.full_name ?? "—",
    autorAvatarUrl: row.autor?.avatar_url ?? null,
    canalId: row.canal?.id ?? row.canal_id,
    canalNome: row.canal?.name ?? "Canal",
    filialId: row.filial?.id ?? null,
    filialNome: row.filial?.name ?? null,
    // Caminho sem assinatura vira string vazia e o card mostra o
    // fallback de imagem indisponível, em vez de <img src="">.
    fotos: row.fotos.map((path) => urlDaFoto(row, path)),
    origem: row.origem,
    tipoAcao: (row.tipo_acao as ActivityCategory | null) ?? null,
    titulo: row.titulo,
    descricao: row.descricao,
    metaId: row.meta_id,
    metaTitulo: row.meta?.title ?? null,
    recebidoEm: row.recebido_em,
  }));
}

/** Quantos envios ainda esperam decisão (badge do menu). */
export async function getInboxPendentesCount(
  profileId: string
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("inbox_registros")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente")
    .eq("autor_id", profileId);

  if (error) return 0;
  return count ?? 0;
}

export type AtividadeAberta = {
  id: string;
  title: string;
  status: ActivityStatus;
  category: ActivityCategory | null;
  dueDate: string | null;
  branchName: string | null;
};

/**
 * Atividades abertas do canal, para a pergunta "isso pertence a quê?".
 *
 * Concluídas ficam de fora: anexar evidência a algo já fechado não é o
 * caso de uso — se já foi concluída, a foto entra por dentro da própria
 * atividade. Ordem: atrasadas primeiro (é o que a evidência costuma
 * resolver), depois por prazo.
 */
export async function getAtividadesAbertasDoCanal(
  channelId: string
): Promise<AtividadeAberta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      `id, title, status, category, due_date,
       branch:branches(name),
       plan:plans!inner(channel_id, status)`
    )
    .eq("plan.status", "ativo")
    .eq("plan.channel_id", channelId)
    .in("status", ["planejada", "em_andamento", "atrasada"])
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    status: string;
    category: string | null;
    due_date: string | null;
    branch: { name: string } | null;
  }[];

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      status: getDisplayStatus({ status: row.status, dueDate: row.due_date }),
      category: (row.category as ActivityCategory | null) ?? null,
      dueDate: row.due_date,
      branchName: row.branch?.name ?? null,
    }))
    .sort((a, b) => {
      const rank = (s: ActivityStatus) => (s === "atrasada" ? 0 : 1);
      if (rank(a.status) !== rank(b.status)) {
        return rank(a.status) - rank(b.status);
      }
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
}

/** Metas do plano ativo do canal — para o vínculo da ação fora do plano. */
export async function getMetasDoCanal(
  channelId: string
): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("problems")
    .select("id, title, plan:plans!inner(channel_id, status)")
    .eq("plan.status", "ativo")
    .eq("plan.channel_id", channelId)
    .order("order_index");

  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, title: row.title }));
}
