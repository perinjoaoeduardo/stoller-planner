import type { Role } from "@/lib/auth/nav";
import { getScopedActivities, type ActivityRow } from "@/lib/db/channels";
import {
  getMyRecentExecutions,
  type RecentExecution,
} from "@/lib/db/execution";
import { isLateActivity } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados do perfil de pessoa (/pessoas/[id]).
 * A pessoa não tem FKs diretas — vínculos vêm de user_links (DSM por
 * canal, RTV/RDC por filial) e o ritmo vem de activity_events. As
 * atividades "dela" = responsible_id ∪ activity_assignees, mesmo
 * critério do painel do DSM.
 */

export type PersonChannelLink = {
  channelId: string;
  channelName: string;
  regionName: string;
  /** Filiais desta pessoa neste canal (vazio para DSM = canal inteiro). */
  branchNames: string[];
};

export type PersonDetail = {
  id: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  links: PersonChannelLink[];
  regionNames: string[];
  /** Atividades da pessoa nos planos ativos (abertas e encerradas). */
  activities: ActivityRow[];
  lastExecutionAt: string | null;
  recentExecutions: RecentExecution[];
  stats: {
    total: number;
    completed: number;
    completedPercent: number;
    late: number;
  };
};

/** Perfil + vínculos + atividades + ritmo de registro de uma pessoa. */
export async function getPersonDetail(
  profileId: string
): Promise<PersonDetail | null> {
  const supabase = await createClient();

  const [profileRes, linksRes, lastEventRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .eq("id", profileId)
      .maybeSingle(),
    supabase
      .from("user_links")
      .select(
        `channel_id, branch_id,
         channel:channels(id, name, region:regions(name)),
         branch:branches(id, name, channel:channels(id, name, region:regions(name)))`
      )
      .eq("profile_id", profileId),
    supabase
      .from("activity_events")
      .select("created_at")
      .eq("type", "execucao_registrada")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (!profileRes.data) return null;
  if (linksRes.error) throw linksRes.error;

  // Consolida vínculos por canal (DSM liga direto; RTV/RDC via filial).
  const linkMap = new Map<string, PersonChannelLink>();
  for (const link of linksRes.data) {
    const channel = link.channel ?? link.branch?.channel ?? null;
    if (!channel) continue;
    let entry = linkMap.get(channel.id);
    if (!entry) {
      entry = {
        channelId: channel.id,
        channelName: channel.name,
        regionName: channel.region?.name ?? "—",
        branchNames: [],
      };
      linkMap.set(channel.id, entry);
    }
    if (link.branch?.name && !entry.branchNames.includes(link.branch.name)) {
      entry.branchNames.push(link.branch.name);
    }
  }
  const links = [...linkMap.values()].sort((a, b) =>
    a.channelName.localeCompare(b.channelName)
  );
  const regionNames = [...new Set(links.map((link) => link.regionName))];

  // Atividades da pessoa dentro dos canais vinculados. DSM: tudo que é
  // dele como executor também aparece — o recorte é "atividades DELA",
  // não do canal inteiro.
  const channelIds = links.map((link) => link.channelId);
  const [allActivities, recentExecutions] = await Promise.all([
    getScopedActivities(channelIds),
    getMyRecentExecutions(profileId, 4),
  ]);
  const activities = allActivities.filter(
    (activity) =>
      activity.responsibleId === profileId ||
      activity.assignees.some((assignee) => assignee.id === profileId)
  );

  const total = activities.length;
  const completed = activities.filter(
    (activity) => activity.status === "concluida"
  ).length;
  const late = activities.filter(isLateActivity).length;

  return {
    id: profileRes.data.id,
    name: profileRes.data.full_name,
    role: profileRes.data.role as Role,
    avatarUrl: profileRes.data.avatar_url,
    links,
    regionNames,
    activities,
    lastExecutionAt: lastEventRes.data?.created_at ?? null,
    recentExecutions,
    stats: {
      total,
      completed,
      completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      late,
    },
  };
}
