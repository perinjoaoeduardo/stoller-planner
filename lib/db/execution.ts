import type { ActivityStatus } from "@/components/shared/status-badge";
import {
  getScopedBranchIds,
  getScopedChannelIds,
  type CurrentProfile,
} from "@/lib/auth/scope";
import type { ActivityCategory } from "@/lib/config";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados do fluxo de execução (Bloco 4): registro em campo,
 * "Minhas Atividades" e cards da home do RTV. Todas as funções filtram
 * pelo escopo do usuário (user_links) — nunca consulte fora dele.
 */

export const OPEN_STATUSES: ActivityStatus[] = ["planejada", "atrasada"];

export type FieldActivity = {
  id: string;
  title: string;
  status: ActivityStatus;
  category: ActivityCategory | null;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  branchId: string | null;
  branchName: string | null;
  channelId: string;
  channelName: string;
  responsibleId: string | null;
  /** Ids dos responsáveis (activity_assignees ∪ responsible_id). */
  assigneeIds: string[];
  problemId: string | null;
  problemTitle: string | null;
  /** Quantos problemas o plano da atividade tem cadastrados. */
  planProblemCount: number;
  photoCount: number;
  /** Foto mais recente (caminho no bucket activity-photos). */
  latestPhotoPath: string | null;
  /** Pendência derivada: concluída sem problema num plano que tem problemas. */
  needsProblemLink: boolean;
  /** O usuário logado é o responsável. */
  isMine: boolean;
  /** A atividade é de uma filial linkada ao usuário. */
  isMyBranch: boolean;
};

export type BranchOption = { id: string; name: string; channelId: string };

export type ChannelOption = {
  id: string;
  name: string;
  openActivityCount: number;
};

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
      .select("id, name, channel_id")
      .in("id", branchIds)
      .order("name");
    if (error) throw error;
    return data.map((b) => ({ id: b.id, name: b.name, channelId: b.channel_id }));
  }

  if (channelIds.length === 0) {
    return { activities: [], branchOptions: await fetchBranchOptions() };
  }

  const [activitiesRes, branchOptions] = await Promise.all([
    supabase
      .from("activities")
      .select(
        `id, title, status, category, description, due_date, completed_at,
         branch_id, branch:branches(name),
         responsible_id,
         assignees:activity_assignees(profile_id),
         problem_id, problem:problems(title),
         photos:activity_photos(storage_path, created_at),
         plan:plans!inner(status, channel_id, channel:channels(id, name),
           problems(id))`
      )
      .eq("plan.status", "ativo")
      .in("plan.channel_id", channelIds),
    fetchBranchOptions(),
  ]);

  if (activitiesRes.error) throw activitiesRes.error;

  const branchIdSet = new Set(branchIds);

  const activities: FieldActivity[] = activitiesRes.data.map((activity) => {
    const status = getDisplayStatus({
      status: activity.status as ActivityStatus,
      dueDate: activity.due_date,
    });
    const planProblemCount = activity.plan?.problems?.length ?? 0;
    const photos = [...activity.photos].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );
    // Compat: enquanto responsible_id existir, ele conta como assignee.
    const assigneeIds = [
      ...new Set(
        [
          ...activity.assignees.map((assignee) => assignee.profile_id),
          activity.responsible_id,
        ].filter((id): id is string => !!id)
      ),
    ];
    return {
      id: activity.id,
      title: activity.title,
      status,
      category: activity.category as ActivityCategory | null,
      description: activity.description,
      dueDate: activity.due_date,
      completedAt: activity.completed_at,
      branchId: activity.branch_id,
      branchName: activity.branch?.name ?? null,
      channelId: activity.plan?.channel?.id ?? "",
      channelName: activity.plan?.channel?.name ?? "—",
      responsibleId: activity.responsible_id,
      assigneeIds,
      problemId: activity.problem_id,
      problemTitle: activity.problem?.title ?? null,
      planProblemCount,
      photoCount: photos.length,
      latestPhotoPath: photos[0]?.storage_path ?? null,
      needsProblemLink:
        status === "concluida" &&
        activity.problem_id === null &&
        planProblemCount > 0,
      isMine: assigneeIds.includes(profile.id),
      isMyBranch:
        activity.branch_id !== null && branchIdSet.has(activity.branch_id),
    };
  });

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

export type BranchPlanInfo = {
  branchId: string;
  planId: string | null;
  /** Problemas do plano ativo do canal da filial (Situação B). */
  problems: { id: string; title: string }[];
};

/**
 * Para cada filial do usuário, o plano ativo do canal dela e os
 * problemas cadastrados — alimenta o registro avulso (fora do plano).
 */
export async function getBranchPlans(
  branchIds: string[]
): Promise<BranchPlanInfo[]> {
  if (branchIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select(
      `id,
       channel:channels(id,
         plans(id, status, problems(id, title, order_index)))`
    )
    .in("id", branchIds);

  if (error) throw error;

  return data.map((branch) => {
    const plan = branch.channel?.plans.find((item) => item.status === "ativo");
    return {
      branchId: branch.id,
      planId: plan?.id ?? null,
      problems: (plan?.problems ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((problem) => ({ id: problem.id, title: problem.title })),
    };
  });
}

/**
 * Canais do escopo do usuário com contagem de atividades abertas —
 * alimenta o picker de canal na tela de registro.
 */
export async function getMyChannels(
  profile: CurrentProfile,
  openActivities: FieldActivity[]
): Promise<ChannelOption[]> {
  const channelIds = await getScopedChannelIds(profile);
  if (channelIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select("id, name")
    .in("id", channelIds)
    .order("name");
  if (error) throw error;

  const countByChannel = new Map<string, number>();
  for (const a of openActivities) {
    countByChannel.set(a.channelId, (countByChannel.get(a.channelId) ?? 0) + 1);
  }

  return data.map((ch) => ({
    id: ch.id,
    name: ch.name,
    openActivityCount: countByChannel.get(ch.id) ?? 0,
  }));
}

export type RecentExecution = {
  id: string;
  description: string | null;
  createdAt: string;
  activityId: string;
  activityTitle: string;
  channelName: string | null;
  branchName: string | null;
  /** Caminho no bucket public activity-photos da foto mais recente. */
  photoPath: string | null;
};

/** Últimos registros de execução feitos pelo usuário (home do RTV). */
export async function getMyRecentExecutions(
  profileId: string,
  limit = 2
): Promise<RecentExecution[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      `id, description, created_at,
       activity:activities(
         id, title,
         branch:branches(name),
         plan:plans(channel:channels(name)),
         photos:activity_photos(storage_path, created_at)
       )`
    )
    .eq("profile_id", profileId)
    .eq("type", "execucao_registrada")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data
    .filter((event) => event.activity)
    .map((event) => {
      const activity = event.activity!;
      const photos = [...(activity.photos ?? [])].sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1
      );
      return {
        id: event.id,
        description: event.description,
        createdAt: event.created_at,
        activityId: activity.id,
        activityTitle: activity.title,
        channelName: activity.plan?.channel?.name ?? null,
        branchName: activity.branch?.name ?? null,
        photoPath: photos[0]?.storage_path ?? null,
      };
    });
}
