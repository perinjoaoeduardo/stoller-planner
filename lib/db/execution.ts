import type { ActivityStatus } from "@/components/app/status-badge";
import {
  getScopedBranchIds,
  getScopedChannelIds,
  type CurrentProfile,
} from "@/lib/auth/scope";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados do fluxo de execução (Bloco 4): registro em campo,
 * "Minhas Atividades" e cards da home do RTV. Todas as funções filtram
 * pelo escopo do usuário (user_links) — nunca consulte fora dele.
 */

export const OPEN_STATUSES: ActivityStatus[] = [
  "planejada",
  "em_andamento",
  "atrasada",
];

export type FieldActivity = {
  id: string;
  title: string;
  status: ActivityStatus;
  dueDate: string | null;
  completedAt: string | null;
  branchId: string | null;
  branchName: string | null;
  channelId: string;
  channelName: string;
  responsibleId: string | null;
  /** O usuário logado é o responsável. */
  isMine: boolean;
  /** A atividade é de uma filial linkada ao usuário. */
  isMyBranch: boolean;
};

export type BranchOption = { id: string; name: string };

export type FieldActivitiesData = {
  activities: FieldActivity[];
  /** Filiais linkadas ao usuário (chips e registro avulso). */
  branchOptions: BranchOption[];
};

/**
 * Todas as atividades do escopo do usuário (planos ativos), com status
 * derivado e ordenadas por relevância: primeiro as do responsável,
 * depois as das filiais dele, ambas por prazo mais próximo.
 */
export async function getFieldActivities(
  profile: CurrentProfile
): Promise<FieldActivitiesData> {
  const [channelIds, branchIds] = await Promise.all([
    getScopedChannelIds(profile),
    getScopedBranchIds(profile),
  ]);

  const supabase = await createClient();

  async function fetchBranchOptions(): Promise<BranchOption[]> {
    if (branchIds.length === 0) return [];
    const { data, error } = await supabase
      .from("branches")
      .select("id, name")
      .in("id", branchIds)
      .order("name");
    if (error) throw error;
    return data;
  }

  if (channelIds.length === 0) {
    return { activities: [], branchOptions: await fetchBranchOptions() };
  }

  const [activitiesRes, branchOptions] = await Promise.all([
    supabase
      .from("activities")
      .select(
        `id, title, status, due_date, completed_at,
         branch_id, branch:branches(name),
         responsible_id,
         plan:plans!inner(status, channel_id, channel:channels(id, name))`
      )
      .eq("plan.status", "ativo")
      .in("plan.channel_id", channelIds),
    fetchBranchOptions(),
  ]);

  if (activitiesRes.error) throw activitiesRes.error;

  const branchIdSet = new Set(branchIds);

  const activities: FieldActivity[] = activitiesRes.data.map((activity) => ({
    id: activity.id,
    title: activity.title,
    status: getDisplayStatus({
      status: activity.status as ActivityStatus,
      dueDate: activity.due_date,
    }),
    dueDate: activity.due_date,
    completedAt: activity.completed_at,
    branchId: activity.branch_id,
    branchName: activity.branch?.name ?? null,
    channelId: activity.plan?.channel?.id ?? "",
    channelName: activity.plan?.channel?.name ?? "—",
    responsibleId: activity.responsible_id,
    isMine: activity.responsible_id === profile.id,
    isMyBranch:
      activity.branch_id !== null && branchIdSet.has(activity.branch_id),
  }));

  // Relevância: minhas → da minha filial → demais; empate por prazo
  // mais próximo (sem prazo por último).
  activities.sort((a, b) => {
    const relevance = (item: FieldActivity) =>
      item.isMine ? 0 : item.isMyBranch ? 1 : 2;
    if (relevance(a) !== relevance(b)) return relevance(a) - relevance(b);
    if (a.dueDate === b.dueDate) return a.title.localeCompare(b.title);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });

  return { activities, branchOptions };
}

export type RecentExecution = {
  id: string;
  description: string | null;
  createdAt: string;
  activityId: string;
  activityTitle: string;
};

/** Últimos registros de execução feitos pelo usuário (home do RTV). */
export async function getMyRecentExecutions(
  profileId: string,
  limit = 2
): Promise<RecentExecution[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, description, created_at, activity:activities(id, title)")
    .eq("profile_id", profileId)
    .eq("type", "execucao_registrada")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data
    .filter((event) => event.activity)
    .map((event) => ({
      id: event.id,
      description: event.description,
      createdAt: event.created_at,
      activityId: event.activity!.id,
      activityTitle: event.activity!.title,
    }));
}
