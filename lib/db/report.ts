import type { ActivityStatus } from "@/components/app/status-badge";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados do Relatório de Safra (Bloco 6).
 * Uma consulta densa por canal: plano ativo, problemas, atividades com
 * fotos e último registro de execução, e a série mensal de registros.
 * O chamador é responsável por validar o escopo (getScopedChannelIds).
 */

export type ReportPhoto = {
  id: string;
  storagePath: string;
  caption: string | null;
  createdAt: string;
  activityId: string;
  activityTitle: string;
};

export type ReportActivity = {
  id: string;
  title: string;
  description: string | null;
  status: ActivityStatus;
  dueDate: string | null;
  completedAt: string | null;
  problemId: string | null;
  branchId: string | null;
  branchName: string | null;
  responsibleName: string | null;
  /** Descrição do último evento de execução registrado. */
  lastExecution: { description: string | null; createdAt: string } | null;
  /** Datas (ISO) de TODOS os registros de execução — série mensal. */
  executionDates: string[];
  photos: ReportPhoto[];
};

export type ReportProblem = {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
};

export type SeasonReport = {
  channel: {
    id: string;
    name: string;
    region: string;
    branches: { id: string; name: string; city: string }[];
  };
  plan: { id: string; harvest: string } | null;
  problems: ReportProblem[];
  activities: ReportActivity[];
};

export async function getSeasonReport(
  channelId: string
): Promise<SeasonReport | null> {
  const supabase = await createClient();

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select(
      `id, name, region:regions(name),
       branches(id, name, city),
       plans(id, harvest, status)`
    )
    .eq("id", channelId)
    .eq("plans.status", "ativo")
    .maybeSingle();

  if (channelError) throw channelError;
  if (!channel) return null;

  const base = {
    channel: {
      id: channel.id,
      name: channel.name,
      region: channel.region?.name ?? "—",
      branches: channel.branches
        .map((branch) => ({
          id: branch.id,
          name: branch.name,
          city: branch.city,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    },
  };

  const plan = channel.plans[0];
  if (!plan) {
    return { ...base, plan: null, problems: [], activities: [] };
  }

  const [problemsRes, activitiesRes] = await Promise.all([
    supabase
      .from("problems")
      .select("id, title, description, order_index")
      .eq("plan_id", plan.id)
      .order("order_index"),
    supabase
      .from("activities")
      .select(
        `id, title, description, status, due_date, completed_at,
         problem_id, branch_id, branch:branches(name),
         responsible:profiles(full_name),
         photos:activity_photos(id, storage_path, caption, created_at),
         events:activity_events(type, description, created_at)`
      )
      .eq("plan_id", plan.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  if (problemsRes.error) throw problemsRes.error;
  if (activitiesRes.error) throw activitiesRes.error;

  const activities: ReportActivity[] = activitiesRes.data.map((activity) => {
    const executions = activity.events
      .filter((event) => event.type === "execucao_registrada")
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      status: getDisplayStatus({
        status: activity.status as ActivityStatus,
        dueDate: activity.due_date,
      }),
      dueDate: activity.due_date,
      completedAt: activity.completed_at,
      problemId: activity.problem_id,
      branchId: activity.branch_id,
      branchName: activity.branch?.name ?? null,
      responsibleName: activity.responsible?.full_name ?? null,
      lastExecution: executions[0]
        ? {
            description: executions[0].description,
            createdAt: executions[0].created_at,
          }
        : null,
      executionDates: executions.map((event) => event.created_at),
      photos: activity.photos
        .map((photo) => ({
          id: photo.id,
          storagePath: photo.storage_path,
          caption: photo.caption,
          createdAt: photo.created_at,
          activityId: activity.id,
          activityTitle: activity.title,
        }))
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    };
  });

  return {
    ...base,
    plan: { id: plan.id, harvest: plan.harvest },
    problems: problemsRes.data.map((problem) => ({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      orderIndex: problem.order_index,
    })),
    activities,
  };
}
