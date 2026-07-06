import type { ActivityStatus } from "@/components/app/status-badge";
import { ACTIVITY_STATUSES } from "@/components/app/status-badge";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

export type UpcomingActivity = {
  id: string;
  title: string;
  dueDate: string | null;
  status: ActivityStatus;
  channel: string;
  responsible: string;
};

export type DashboardData = {
  totalActivities: number;
  completedCount: number;
  completedPercent: number;
  overdueCount: number;
  activeChannels: number;
  byStatus: { status: ActivityStatus; total: number }[];
  upcoming: UpcomingActivity[];
};

const PENDING_STATUSES: ActivityStatus[] = [
  "planejada",
  "em_andamento",
  "atrasada",
];

const EMPTY_DASHBOARD: DashboardData = {
  totalActivities: 0,
  completedCount: 0,
  completedPercent: 0,
  overdueCount: 0,
  activeChannels: 0,
  byStatus: ACTIVITY_STATUSES.map((status) => ({ status, total: 0 })),
  upcoming: [],
};

/**
 * Métricas do dashboard restritas aos canais visíveis do usuário
 * (getScopedChannelIds). Para CX, channelIds contém todos os canais.
 */
export async function getDashboardData(
  channelIds: string[]
): Promise<DashboardData> {
  if (channelIds.length === 0) return EMPTY_DASHBOARD;

  const supabase = await createClient();

  const [activitiesRes, plansRes] = await Promise.all([
    supabase
      .from("activities")
      .select(
        "id, title, due_date, status, plan:plans!inner(channel_id, channel:channels(name)), responsible:profiles(full_name)"
      )
      .in("plan.channel_id", channelIds),
    supabase
      .from("plans")
      .select("channel_id")
      .eq("status", "ativo")
      .in("channel_id", channelIds),
  ]);

  if (activitiesRes.error) throw activitiesRes.error;
  if (plansRes.error) throw plansRes.error;

  const activities = activitiesRes.data.map((activity) => ({
    id: activity.id,
    title: activity.title,
    dueDate: activity.due_date,
    status: getDisplayStatus({
      status: activity.status as ActivityStatus,
      dueDate: activity.due_date,
    }),
    channel: activity.plan?.channel?.name ?? "—",
    responsible: activity.responsible?.full_name ?? "—",
  }));

  const totalActivities = activities.length;
  const completedCount = activities.filter(
    (activity) => activity.status === "concluida"
  ).length;
  const overdueCount = activities.filter(
    (activity) => activity.status === "atrasada"
  ).length;
  const activeChannels = new Set(
    plansRes.data.map((plan) => plan.channel_id)
  ).size;

  const byStatus = ACTIVITY_STATUSES.map((status) => ({
    status,
    total: activities.filter((activity) => activity.status === status).length,
  }));

  const upcoming = activities
    .filter(
      (activity) =>
        activity.dueDate !== null &&
        PENDING_STATUSES.includes(activity.status)
    )
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 10);

  return {
    totalActivities,
    completedCount,
    completedPercent:
      totalActivities > 0
        ? Math.round((completedCount / totalActivities) * 100)
        : 0,
    overdueCount,
    activeChannels,
    byStatus,
    upcoming,
  };
}

export type ChannelSummary = {
  id: string;
  name: string;
  region: string;
  branchCount: number;
};

/** Canais (com região e nº de filiais) para o card "Meus canais" do DSM. */
export async function getChannelsSummary(
  channelIds: string[]
): Promise<ChannelSummary[]> {
  if (channelIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select("id, name, region:regions(name), branches(id)")
    .in("id", channelIds)
    .order("name");

  if (error) throw error;

  return data.map((channel) => ({
    id: channel.id,
    name: channel.name,
    region: channel.region?.name ?? "—",
    branchCount: channel.branches.length,
  }));
}

