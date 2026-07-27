import type { Role } from "@/lib/auth/nav";
import { isLateActivity } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Time do canal — quem atua ali e com que carga.
 *
 * O vínculo mora em `user_links`, que aceita dois formatos e é isso que
 * define o papel de cada um na tela:
 * - DSM  → uma linha com `channel_id` (responde pelo canal inteiro)
 * - RTV  → uma linha por FILIAL (`branch_id`); o canal é derivado dela
 *
 * O CX não tem vínculo: ele enxerga tudo por definição, então nunca
 * aparece como membro de um canal.
 */

export type ChannelPerson = {
  profileId: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  /** Filiais em que atua neste canal (vazio no DSM = canal inteiro). */
  branches: { id: string; name: string }[];
  /** Ids das linhas de user_links deste canal — usados para desvincular. */
  linkIds: string[];
  openCount: number;
  lateCount: number;
  completedCount: number;
  lastExecutionAt: string | null;
};

export type ChannelTeam = {
  people: ChannelPerson[];
  /** Filiais do canal, para o seletor de vínculo. */
  branches: { id: string; name: string }[];
};

type LinkRow = {
  id: string;
  profile_id: string;
  channel_id: string | null;
  branch_id: string | null;
  profile: { id: string; full_name: string; role: string; avatar_url: string | null } | null;
  branch: { id: string; name: string; channel_id: string } | null;
};

export async function getChannelTeam(channelId: string): Promise<ChannelTeam> {
  const supabase = await createClient();

  const [branchesRes, linksRes] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name")
      .eq("channel_id", channelId)
      .order("name"),
    supabase
      .from("user_links")
      .select(
        `id, profile_id, channel_id, branch_id,
         profile:profiles(id, full_name, role, avatar_url),
         branch:branches(id, name, channel_id)`
      ),
  ]);

  if (branchesRes.error) throw branchesRes.error;
  if (linksRes.error) throw linksRes.error;

  const branches = branchesRes.data ?? [];
  const branchIds = new Set(branches.map((branch) => branch.id));

  // Um vínculo pertence a este canal se aponta direto para ele (DSM) ou
  // para uma filial dele (RTV).
  const links = (linksRes.data as unknown as LinkRow[]).filter(
    (link) =>
      link.channel_id === channelId ||
      (link.branch_id !== null && branchIds.has(link.branch_id))
  );

  const byProfile = new Map<string, ChannelPerson>();
  for (const link of links) {
    if (!link.profile) continue;
    let person = byProfile.get(link.profile_id);
    if (!person) {
      person = {
        profileId: link.profile_id,
        name: link.profile.full_name,
        role: link.profile.role as Role,
        avatarUrl: link.profile.avatar_url,
        branches: [],
        linkIds: [],
        openCount: 0,
        lateCount: 0,
        completedCount: 0,
        lastExecutionAt: null,
      };
      byProfile.set(link.profile_id, person);
    }
    person.linkIds.push(link.id);
    if (link.branch) {
      person.branches.push({ id: link.branch.id, name: link.branch.name });
    }
  }

  const profileIds = [...byProfile.keys()];
  if (profileIds.length > 0) {
    await Promise.all([
      attachActivityStats(supabase, channelId, byProfile),
      attachLastExecution(supabase, profileIds, byProfile),
    ]);
  }

  // Ordem: DSM primeiro (responde pelo canal), depois RTV por nome.
  const people = [...byProfile.values()].sort((a, b) => {
    if (a.role !== b.role) return a.role === "DSM" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const person of people) {
    person.branches.sort((a, b) => a.name.localeCompare(b.name));
  }

  return { people, branches };
}

/** Carga de trabalho de cada pessoa NESTE canal (plano ativo). */
async function attachActivityStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  channelId: string,
  byProfile: Map<string, ChannelPerson>
) {
  const { data, error } = await supabase
    .from("activities")
    .select(
      `id, status, due_date, responsible_id,
       activity_assignees(profile_id),
       plan:plans!inner(channel_id, status)`
    )
    .eq("plan.status", "ativo")
    .eq("plan.channel_id", channelId);

  if (error) throw error;

  for (const activity of data ?? []) {
    const owners = new Set<string>();
    if (activity.responsible_id) owners.add(activity.responsible_id);
    for (const assignee of activity.activity_assignees ?? []) {
      if (assignee.profile_id) owners.add(assignee.profile_id);
    }
    for (const ownerId of owners) {
      const person = byProfile.get(ownerId);
      if (!person) continue;
      if (activity.status === "concluida") {
        person.completedCount += 1;
        continue;
      }
      if (activity.status === "nao_feita") continue;
      person.openCount += 1;
      if (
        isLateActivity({ status: activity.status, dueDate: activity.due_date })
      ) {
        person.lateCount += 1;
      }
    }
  }
}

/** Último registro de execução da pessoa (em qualquer canal). */
async function attachLastExecution(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileIds: string[],
  byProfile: Map<string, ChannelPerson>
) {
  const { data, error } = await supabase
    .from("activity_events")
    .select("profile_id, created_at")
    .in("profile_id", profileIds)
    .eq("type", "execucao_registrada")
    .order("created_at", { ascending: false });

  if (error) throw error;

  for (const event of data ?? []) {
    if (!event.profile_id) continue;
    const person = byProfile.get(event.profile_id);
    // Vem ordenado por data desc: o primeiro que cai aqui é o mais
    // recente daquela pessoa.
    if (person && !person.lastExecutionAt) {
      person.lastExecutionAt = event.created_at;
    }
  }
}

export type AssignablePerson = {
  id: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
};

/**
 * Candidatos a entrar no time: DSM e RTV do sistema. O CX fica de fora
 * — ele já vê tudo, então "vincular CX a um canal" não significa nada.
 */
export async function getAssignablePeople(): Promise<AssignablePerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .in("role", ["DSM", "RTV"])
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name,
    role: profile.role as Role,
    avatarUrl: profile.avatar_url,
  }));
}
