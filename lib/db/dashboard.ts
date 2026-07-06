import type { ActivityStatus } from "@/components/app/status-badge";
import { ACTIVITY_STATUSES } from "@/components/app/status-badge";
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

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [activitiesRes, plansRes] = await Promise.all([
    supabase
      .from("activities")
      .select(
        "id, title, due_date, status, plan:plans(channel:channels(name)), responsible:profiles(full_name)"
      ),
    supabase.from("plans").select("channel_id").eq("status", "ativo"),
  ]);

  if (activitiesRes.error) throw activitiesRes.error;
  if (plansRes.error) throw plansRes.error;

  const activities = activitiesRes.data.map((activity) => ({
    id: activity.id,
    title: activity.title,
    dueDate: activity.due_date,
    status: activity.status as ActivityStatus,
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
