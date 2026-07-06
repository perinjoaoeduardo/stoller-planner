import type { ActivityStatus } from "@/components/app/status-badge";
import { computeHealth, type ChannelHealth } from "@/lib/plan-utils";
import { getDisplayStatus, isLateActivity } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

export { HEALTH_CONFIG, type ChannelHealth } from "@/lib/plan-utils";

/**
 * Camada de dados do cockpit de canais (Bloco 3).
 * Todas as funções recebem ids já filtrados pela camada de escopo
 * (getScopedChannelIds/getScopedBranchIds) — nunca consulte fora dela.
 */

export type ChannelCard = {
  id: string;
  name: string;
  region: string;
  regionId: string;
  harvest: string | null;
  problemCount: number;
  activityCount: number;
  completedCount: number;
  completedPercent: number;
  lateCount: number;
  health: ChannelHealth;
};

/** Cards da página "Meus Canais", com saúde calculada por canal. */
export async function getChannelCards(
  channelIds: string[]
): Promise<ChannelCard[]> {
  if (channelIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select(
      `id, name, region_id, region:regions(id, name),
       plans(id, harvest, status,
         problems(id),
         activities(id, status, due_date))`
    )
    .in("id", channelIds)
    .eq("plans.status", "ativo")
    .order("name");

  if (error) throw error;

  const cards = data.map((channel) => {
    const plan = channel.plans[0];
    const activities = (plan?.activities ?? []).map((activity) => ({
      status: activity.status as ActivityStatus,
      dueDate: activity.due_date,
    }));
    const total = activities.length;
    const completed = activities.filter(
      (activity) => activity.status === "concluida"
    ).length;
    const late = activities.filter(isLateActivity).length;

    return {
      id: channel.id,
      name: channel.name,
      region: channel.region?.name ?? "—",
      regionId: channel.region_id,
      harvest: plan?.harvest ?? null,
      problemCount: plan?.problems.length ?? 0,
      activityCount: total,
      completedCount: completed,
      completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      lateCount: late,
      health: computeHealth(late, total),
    } satisfies ChannelCard;
  });

  // Críticos primeiro, depois atenção, depois em dia; empate por nome.
  const order: Record<ChannelHealth, number> = {
    critico: 0,
    atencao: 1,
    em_dia: 2,
  };
  return cards.sort(
    (a, b) => order[a.health] - order[b.health] || a.name.localeCompare(b.name)
  );
}

export type RegionOption = { id: string; name: string };

export async function getRegions(): Promise<RegionOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regions")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data;
}

export type ChannelDetail = {
  id: string;
  name: string;
  region: string;
  branches: { id: string; name: string; city: string }[];
  plan: { id: string; harvest: string } | null;
};

/** Cabeçalho da página do canal: canal + região + filiais + plano ativo. */
export async function getChannelDetail(
  channelId: string
): Promise<ChannelDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select(
      `id, name, region:regions(name),
       branches(id, name, city),
       plans(id, harvest, status)`
    )
    .eq("id", channelId)
    .eq("plans.status", "ativo")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const plan = data.plans[0];
  return {
    id: data.id,
    name: data.name,
    region: data.region?.name ?? "—",
    branches: data.branches
      .map((branch) => ({ id: branch.id, name: branch.name, city: branch.city }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    plan: plan ? { id: plan.id, harvest: plan.harvest } : null,
  };
}

export type ProblemRow = {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
};

export type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  status: ActivityStatus;
  dueDate: string | null;
  createdAt: string;
  problemId: string | null;
  problemTitle: string | null;
  branchId: string | null;
  branchName: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  photoCount: number;
  channelId: string;
  channelName: string;
};

export type PlanBoard = {
  problems: ProblemRow[];
  activities: ActivityRow[];
};

/** Problemas + atividades do plano ativo (corpo da página do canal). */
export async function getPlanBoard(
  planId: string,
  channel: { id: string; name: string }
): Promise<PlanBoard> {
  const supabase = await createClient();

  const [problemsRes, activitiesRes] = await Promise.all([
    supabase
      .from("problems")
      .select("id, title, description, order_index")
      .eq("plan_id", planId)
      .order("order_index"),
    supabase
      .from("activities")
      .select(
        `id, title, description, status, due_date, created_at,
         problem_id, problem:problems(title),
         branch_id, branch:branches(name),
         responsible_id, responsible:profiles(full_name),
         photos:activity_photos(id)`
      )
      .eq("plan_id", planId)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  if (problemsRes.error) throw problemsRes.error;
  if (activitiesRes.error) throw activitiesRes.error;

  return {
    problems: problemsRes.data.map((problem) => ({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      orderIndex: problem.order_index,
    })),
    activities: activitiesRes.data.map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      status: getDisplayStatus({
        status: activity.status as ActivityStatus,
        dueDate: activity.due_date,
      }),
      dueDate: activity.due_date,
      createdAt: activity.created_at,
      problemId: activity.problem_id,
      problemTitle: activity.problem?.title ?? null,
      branchId: activity.branch_id,
      branchName: activity.branch?.name ?? null,
      responsibleId: activity.responsible_id,
      responsibleName: activity.responsible?.full_name ?? null,
      photoCount: activity.photos.length,
      channelId: channel.id,
      channelName: channel.name,
    })),
  };
}

export type ResponsibleOption = {
  id: string;
  name: string;
  role: string;
};

/** Perfis vinculados ao canal ou às suas filiais (opções de responsável). */
export async function getChannelResponsibles(
  channelId: string,
  branchIds: string[]
): Promise<ResponsibleOption[]> {
  const supabase = await createClient();

  const orParts = [`channel_id.eq.${channelId}`];
  if (branchIds.length > 0) {
    orParts.push(`branch_id.in.(${branchIds.join(",")})`);
  }

  const { data, error } = await supabase
    .from("user_links")
    .select("profile:profiles(id, full_name, role)")
    .or(orParts.join(","));

  if (error) throw error;

  const seen = new Map<string, ResponsibleOption>();
  for (const link of data) {
    if (link.profile && !seen.has(link.profile.id)) {
      seen.set(link.profile.id, {
        id: link.profile.id,
        name: link.profile.full_name,
        role: link.profile.role,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Atividades de todos os canais do escopo (página global /atividades). */
export async function getScopedActivities(
  channelIds: string[]
): Promise<ActivityRow[]> {
  if (channelIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      `id, title, description, status, due_date, created_at,
       problem_id, problem:problems(title),
       branch_id, branch:branches(name),
       responsible_id, responsible:profiles(full_name),
       photos:activity_photos(id),
       plan:plans!inner(channel_id, status, channel:channels(id, name))`
    )
    .eq("plan.status", "ativo")
    .in("plan.channel_id", channelIds)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return data.map((activity) => ({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    status: getDisplayStatus({
      status: activity.status as ActivityStatus,
      dueDate: activity.due_date,
    }),
    dueDate: activity.due_date,
    createdAt: activity.created_at,
    problemId: activity.problem_id,
    problemTitle: activity.problem?.title ?? null,
    branchId: activity.branch_id,
    branchName: activity.branch?.name ?? null,
    responsibleId: activity.responsible_id,
    responsibleName: activity.responsible?.full_name ?? null,
    photoCount: activity.photos.length,
    channelId: activity.plan?.channel?.id ?? "",
    channelName: activity.plan?.channel?.name ?? "—",
  }));
}

export type ActivityEventRow = {
  id: string;
  type: string;
  description: string | null;
  createdAt: string;
  profileName: string | null;
};

export type ActivityPhotoRow = {
  id: string;
  storagePath: string;
  caption: string | null;
  createdAt: string;
};

export type ActivityDetail = {
  id: string;
  title: string;
  description: string | null;
  status: ActivityStatus;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  planId: string;
  problemId: string | null;
  problemTitle: string | null;
  branchId: string | null;
  branchName: string | null;
  branchCity: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  channelId: string;
  channelName: string;
  photos: ActivityPhotoRow[];
  events: ActivityEventRow[];
};

/** Tudo que a página de detalhe da atividade precisa, em uma consulta. */
export async function getActivityDetail(
  activityId: string
): Promise<ActivityDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      `id, title, description, status, due_date, created_at, completed_at,
       plan_id, problem_id, problem:problems(title),
       branch_id, branch:branches(name, city),
       responsible_id, responsible:profiles(full_name),
       plan:plans(channel_id, channel:channels(id, name)),
       photos:activity_photos(id, storage_path, caption, created_at),
       events:activity_events(id, type, description, created_at,
         profile:profiles(full_name))`
    )
    .eq("id", activityId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: getDisplayStatus({
      status: data.status as ActivityStatus,
      dueDate: data.due_date,
    }),
    dueDate: data.due_date,
    createdAt: data.created_at,
    completedAt: data.completed_at,
    planId: data.plan_id,
    problemId: data.problem_id,
    problemTitle: data.problem?.title ?? null,
    branchId: data.branch_id,
    branchName: data.branch?.name ?? null,
    branchCity: data.branch?.city ?? null,
    responsibleId: data.responsible_id,
    responsibleName: data.responsible?.full_name ?? null,
    channelId: data.plan?.channel?.id ?? "",
    channelName: data.plan?.channel?.name ?? "—",
    photos: data.photos
      .map((photo) => ({
        id: photo.id,
        storagePath: photo.storage_path,
        caption: photo.caption,
        createdAt: photo.created_at,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    events: data.events
      .map((event) => ({
        id: event.id,
        type: event.type,
        description: event.description,
        createdAt: event.created_at,
        profileName: event.profile?.full_name ?? null,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };
}
