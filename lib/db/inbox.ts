import type { CurrentProfile } from "@/lib/auth/scope";
import type { ActivityStatus } from "@/components/shared/status-badge";
import type { ActivityCategory } from "@/lib/config";
import { getDisplayStatus } from "@/lib/db/status";
import { INBOX_PHOTO_BUCKET, INBOX_SIGNED_URL_TTL } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

/**
 * Caixa de entrada — registros que chegaram do campo e ainda não viraram
 * atividade.
 *
 * O modelo mental é fila, não pasta: o objetivo é chegar a zero. Por isso
 * a leitura padrão traz só `pendente`; `registrado` e `descartado` viram
 * histórico e são assunto da triagem (prompt 2).
 *
 * As fotos vivem em bucket PRIVADO, então toda leitura assina as URLs
 * aqui, no servidor. O componente nunca monta URL de foto.
 */

export type InboxRegistro = {
  id: string;
  autorId: string;
  autorNome: string;
  autorAvatarUrl: string | null;
  canalId: string;
  canalNome: string;
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

/** Um grupo da lista: o canal e os registros dele, mais novo primeiro. */
export type InboxGrupo = {
  canalId: string;
  canalNome: string;
  registros: InboxRegistro[];
};

export type InboxFiltros = {
  /** Ligado, traz o escopo inteiro; desligado, só os envios do usuário. */
  verDeTodos?: boolean;
  canalId?: string | null;
  origem?: string | null;
};

type Row = {
  id: string;
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
  filial: { name: string } | null;
  meta: { title: string } | null;
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
 * Registros pendentes, agrupados por canal. Canal com registro mais
 * recente primeiro; dentro do grupo, mais recente no topo — a fila
 * responde "o que chegou agora", não "o que está aqui há mais tempo".
 */
export async function getInboxPendentes(
  profile: CurrentProfile,
  channelIds: string[],
  filtros: InboxFiltros = {}
): Promise<InboxGrupo[]> {
  if (channelIds.length === 0) return [];

  const supabase = await createClient();

  let query = supabase
    .from("inbox_registros")
    .select(
      `id, autor_id, canal_id, fotos, origem, tipo_acao, titulo, descricao,
       meta_id, recebido_em,
       autor:profiles!inbox_registros_autor_id_fkey(id, full_name, avatar_url),
       canal:channels(id, name),
       filial:branches(name),
       meta:problems(title)`
    )
    .eq("status", "pendente")
    .in("canal_id", channelIds)
    .order("recebido_em", { ascending: false });

  // Padrão: cada um abre vendo os próprios envios.
  if (!filtros.verDeTodos) query = query.eq("autor_id", profile.id);
  if (filtros.canalId) query = query.eq("canal_id", filtros.canalId);
  if (filtros.origem) query = query.eq("origem", filtros.origem);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];
  const signed = await signPhotos(
    supabase,
    rows.flatMap((row) => row.fotos)
  );

  const grupos = new Map<string, InboxGrupo>();
  for (const row of rows) {
    const canalId = row.canal?.id ?? row.canal_id;
    let grupo = grupos.get(canalId);
    if (!grupo) {
      grupo = {
        canalId,
        canalNome: row.canal?.name ?? "Canal",
        registros: [],
      };
      grupos.set(canalId, grupo);
    }
    grupo.registros.push({
      id: row.id,
      autorId: row.autor_id,
      autorNome: row.autor?.full_name ?? "—",
      autorAvatarUrl: row.autor?.avatar_url ?? null,
      canalId,
      canalNome: row.canal?.name ?? "Canal",
      filialNome: row.filial?.name ?? null,
      // Caminho sem assinatura vira string vazia e o card mostra o
      // fallback de imagem indisponível, em vez de <img src="">.
      fotos: row.fotos.map((path) => signed.get(path) ?? ""),
      origem: row.origem,
      tipoAcao: (row.tipo_acao as ActivityCategory | null) ?? null,
      titulo: row.titulo,
      descricao: row.descricao,
      metaId: row.meta_id,
      metaTitulo: row.meta?.title ?? null,
      recebidoEm: row.recebido_em,
    });
  }

  // A query já vem ordenada por data desc, então o primeiro registro de
  // cada grupo é o mais recente dele — basta ordenar os grupos por esse.
  return [...grupos.values()].sort((a, b) =>
    a.registros[0].recebidoEm < b.registros[0].recebidoEm ? 1 : -1
  );
}

/** Quantos envios do próprio usuário estão esperando (badge do menu). */
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

/** Canais do escopo, para o filtro e para o formulário de simulação. */
export async function getInboxCanais(
  channelIds: string[]
): Promise<{ id: string; name: string }[]> {
  if (channelIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select("id, name")
    .in("id", channelIds)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export type AtividadeParaVincular = {
  id: string;
  title: string;
  status: ActivityStatus;
  dueDate: string | null;
  branchName: string | null;
};

/**
 * Atividades abertas do canal, para o drawer de vincular.
 *
 * Concluídas ficam de fora: anexar evidência a algo já fechado não é o
 * caso de uso — se já foi concluída, a foto entra por dentro da própria
 * atividade. Ordem: atrasadas primeiro (é o que a evidência costuma
 * resolver), depois por prazo.
 */
export async function getAtividadesDoCanal(
  channelId: string
): Promise<AtividadeParaVincular[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      `id, title, status, due_date,
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
    due_date: string | null;
    branch: { name: string } | null;
  }[];

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      status: getDisplayStatus({ status: row.status, dueDate: row.due_date }),
      dueDate: row.due_date,
      branchName: row.branch?.name ?? null,
    }))
    .sort((a, b) => {
      const rank = (s: ActivityStatus) => (s === "atrasada" ? 0 : 1);
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
}

/** Metas do plano ativo do canal — para o diálogo de criar atividade. */
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
