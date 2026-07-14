"use server";

import { revalidatePath } from "next/cache";

import type { ActivityStatus } from "@/components/shared/status-badge";
import { STATUS_LABELS } from "@/components/shared/status-badge";
import {
  isCategoryRequired,
  isProblemRequired,
} from "@/lib/activities/rules";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "@/lib/config";
import {
  canEditPlan,
  canRegisterExecution,
  getCurrentProfile,
  type CurrentProfile,
} from "@/lib/auth/scope";
import { setAssignees } from "@/lib/db/assignees";
import { logActivityEvent } from "@/lib/db/events";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions de mutação do plano (problemas, atividades, fotos).
 * Toda action revalida escopo no servidor — o client nunca é confiável.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR =
  "Não foi possível concluir a ação. Tente novamente em instantes.";

async function getPlanChannelId(planId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("channel_id")
    .eq("id", planId)
    .maybeSingle();
  return data?.channel_id ?? null;
}

async function requirePlanEditor(
  planId: string
): Promise<{ profile: CurrentProfile; channelId: string } | null> {
  const profile = await getCurrentProfile();
  const channelId = await getPlanChannelId(planId);
  if (!channelId) return null;
  if (!(await canEditPlan(profile, channelId))) return null;
  return { profile, channelId };
}

function revalidatePlanPages(channelId: string, activityId?: string) {
  revalidatePath("/");
  revalidatePath("/canais");
  revalidatePath(`/canais/${channelId}`);
  revalidatePath("/atividades");
  if (activityId) revalidatePath(`/atividades/${activityId}`);
}

const logEvent = logActivityEvent;

// ─── Problemas ───────────────────────────────────────────────────────────────

export async function createProblem(input: {
  planId: string;
  title: string;
  description?: string;
}): Promise<ActionResult> {
  const auth = await requirePlanEditor(input.planId);
  if (!auth) return { ok: false, error: "Você não pode editar este plano." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("problems")
    .select("order_index")
    .eq("plan_id", input.planId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("problems").insert({
    plan_id: input.planId,
    title: input.title,
    description: input.description || null,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePlanPages(auth.channelId);
  return { ok: true };
}

export async function updateProblem(input: {
  problemId: string;
  title: string;
  description?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: problem } = await supabase
    .from("problems")
    .select("plan_id")
    .eq("id", input.problemId)
    .maybeSingle();
  if (!problem) return { ok: false, error: "Problema não encontrado." };

  const auth = await requirePlanEditor(problem.plan_id);
  if (!auth) return { ok: false, error: "Você não pode editar este plano." };

  const { error } = await supabase
    .from("problems")
    .update({ title: input.title, description: input.description || null })
    .eq("id", input.problemId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePlanPages(auth.channelId);
  return { ok: true };
}

/**
 * Exclui o problema desvinculando as atividades (problem_id = null) —
 * atividades nunca são apagadas junto.
 */
export async function deleteProblem(input: {
  problemId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: problem } = await supabase
    .from("problems")
    .select("plan_id")
    .eq("id", input.problemId)
    .maybeSingle();
  if (!problem) return { ok: false, error: "Problema não encontrado." };

  const auth = await requirePlanEditor(problem.plan_id);
  if (!auth) return { ok: false, error: "Você não pode editar este plano." };

  const { error: unlinkError } = await supabase
    .from("activities")
    .update({ problem_id: null })
    .eq("problem_id", input.problemId);
  if (unlinkError) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase
    .from("problems")
    .delete()
    .eq("id", input.problemId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePlanPages(auth.channelId);
  return { ok: true };
}

/** Sobe/desce o problema trocando order_index com o vizinho. */
export async function moveProblem(input: {
  problemId: string;
  direction: "up" | "down";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: problem } = await supabase
    .from("problems")
    .select("plan_id")
    .eq("id", input.problemId)
    .maybeSingle();
  if (!problem) return { ok: false, error: "Problema não encontrado." };

  const auth = await requirePlanEditor(problem.plan_id);
  if (!auth) return { ok: false, error: "Você não pode editar este plano." };

  const { data: problems, error } = await supabase
    .from("problems")
    .select("id, order_index")
    .eq("plan_id", problem.plan_id)
    .order("order_index");
  if (error || !problems) return { ok: false, error: GENERIC_ERROR };

  const index = problems.findIndex((item) => item.id === input.problemId);
  const targetIndex = input.direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= problems.length) {
    return { ok: true };
  }

  const current = problems[index];
  const target = problems[targetIndex];
  const [swapA, swapB] = await Promise.all([
    supabase
      .from("problems")
      .update({ order_index: target.order_index })
      .eq("id", current.id),
    supabase
      .from("problems")
      .update({ order_index: current.order_index })
      .eq("id", target.id),
  ]);
  if (swapA.error || swapB.error) return { ok: false, error: GENERIC_ERROR };

  revalidatePlanPages(auth.channelId);
  return { ok: true };
}

// ─── Atividades ──────────────────────────────────────────────────────────────

export type ActivityInput = {
  title: string;
  category: ActivityCategory;
  description?: string;
  problemId?: string | null;
  branchId?: string | null;
  responsibleId?: string | null;
  dueDate?: string | null;
  status: ActivityStatus;
};

/** Valida categoria + problema conforme as regras centrais (rules.ts). */
async function validateActivityRules(
  planId: string,
  input: Pick<ActivityInput, "category" | "problemId">
): Promise<string | null> {
  if (
    isCategoryRequired() &&
    !ACTIVITY_CATEGORIES.includes(input.category)
  ) {
    return "Selecione a categoria da atividade.";
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("problems")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId);
  if (isProblemRequired({ problemCount: count ?? 0 }) && !input.problemId) {
    return "Vincule a atividade a um problema do plano.";
  }
  return null;
}

export async function createActivity(
  input: ActivityInput & { planId: string }
): Promise<ActionResult> {
  const auth = await requirePlanEditor(input.planId);
  if (!auth) return { ok: false, error: "Você não pode editar este plano." };

  const rulesError = await validateActivityRules(input.planId, input);
  if (rulesError) return { ok: false, error: rulesError };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .insert({
      plan_id: input.planId,
      title: input.title,
      category: input.category,
      description: input.description || null,
      problem_id: input.problemId || null,
      branch_id: input.branchId || null,
      responsible_id: input.responsibleId || null,
      due_date: input.dueDate || null,
      status: input.status,
      completed_at: input.status === "concluida" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  // Compat múltiplos responsáveis: o form ainda salva um único
  // responsible_id — espelha em activity_assignees.
  await setAssignees(data.id, input.responsibleId ? [input.responsibleId] : []);

  await logEvent({
    activityId: data.id,
    profileId: auth.profile.id,
    type: "criada",
    description: `Atividade criada por ${auth.profile.fullName}`,
  });

  revalidatePlanPages(auth.channelId, data.id);
  return { ok: true };
}

export async function updateActivity(
  input: ActivityInput & { activityId: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("activities")
    .select("plan_id, status, completed_at")
    .eq("id", input.activityId)
    .maybeSingle();
  if (!current) return { ok: false, error: "Atividade não encontrada." };

  const auth = await requirePlanEditor(current.plan_id);
  if (!auth) return { ok: false, error: "Você não pode editar este plano." };

  const rulesError = await validateActivityRules(current.plan_id, input);
  if (rulesError) return { ok: false, error: rulesError };

  const statusChanged = current.status !== input.status;
  const completedAt =
    input.status === "concluida"
      ? current.completed_at ?? new Date().toISOString()
      : null;

  const { error } = await supabase
    .from("activities")
    .update({
      title: input.title,
      category: input.category,
      description: input.description || null,
      problem_id: input.problemId || null,
      branch_id: input.branchId || null,
      responsible_id: input.responsibleId || null,
      due_date: input.dueDate || null,
      status: input.status,
      completed_at: completedAt,
    })
    .eq("id", input.activityId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  // Compat múltiplos responsáveis: espelha o responsável único do form.
  await setAssignees(
    input.activityId,
    input.responsibleId ? [input.responsibleId] : []
  );

  if (statusChanged) {
    await logEvent({
      activityId: input.activityId,
      profileId: auth.profile.id,
      type: "status_alterado",
      description: `Status alterado de "${STATUS_LABELS[current.status as ActivityStatus]}" para "${STATUS_LABELS[input.status]}" por ${auth.profile.fullName}`,
    });
  }

  revalidatePlanPages(auth.channelId, input.activityId);
  return { ok: true };
}

/**
 * Vincula/desvincula só o problema da atividade (edição trivial pós
 * "vincular depois"). Permissão ampla: além de quem edita o plano, o
 * RTV/RDC que pode registrar execução também pode ajustar o vínculo.
 */
export async function updateActivityProblem(input: {
  activityId: string;
  problemId: string | null;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from("activities")
    .select(
      "plan_id, problem_id, responsible_id, branch_id, plan:plans(channel_id)"
    )
    .eq("id", input.activityId)
    .maybeSingle();
  if (!activity?.plan) return { ok: false, error: "Atividade não encontrada." };

  const [editor, registrar] = await Promise.all([
    canEditPlan(profile, activity.plan.channel_id),
    canRegisterExecution(profile, {
      id: input.activityId,
      responsible_id: activity.responsible_id,
      branch_id: activity.branch_id,
      channel_id: activity.plan.channel_id,
    }),
  ]);
  if (!editor && !registrar) {
    return { ok: false, error: "Você não pode alterar esta atividade." };
  }

  let problemTitle: string | null = null;
  if (input.problemId) {
    const { data: problem } = await supabase
      .from("problems")
      .select("id, title, plan_id")
      .eq("id", input.problemId)
      .maybeSingle();
    if (!problem || problem.plan_id !== activity.plan_id) {
      return { ok: false, error: "Este problema não pertence ao plano." };
    }
    problemTitle = problem.title;
  }

  if (activity.problem_id === input.problemId) return { ok: true };

  const { error } = await supabase
    .from("activities")
    .update({ problem_id: input.problemId })
    .eq("id", input.activityId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logEvent({
    activityId: input.activityId,
    profileId: profile.id,
    type: "editada",
    description: input.problemId
      ? `Meta vinculada por ${profile.fullName}: ${problemTitle}`
      : `Vínculo com meta removido por ${profile.fullName}`,
  });

  revalidatePlanPages(activity.plan.channel_id, input.activityId);
  revalidatePath("/minhas-atividades");
  return { ok: true };
}

export async function deleteActivity(input: {
  activityId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: activity } = await supabase
    .from("activities")
    .select("plan_id, photos:activity_photos(storage_path)")
    .eq("id", input.activityId)
    .maybeSingle();
  if (!activity) return { ok: false, error: "Atividade não encontrada." };

  const auth = await requirePlanEditor(activity.plan_id);
  if (!auth) return { ok: false, error: "Você não pode editar este plano." };

  // Remove os arquivos do bucket antes (as linhas caem em cascata).
  const paths = activity.photos.map((photo) => photo.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from("activity-photos").remove(paths);
  }

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", input.activityId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePlanPages(auth.channelId);
  return { ok: true };
}

/**
 * Muda só o status (card "Status" do detalhe). Permissão mais ampla que
 * edição de plano: RTV/RDC responsáveis/linkados também podem.
 */
export async function changeActivityStatus(input: {
  activityId: string;
  status: ActivityStatus;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from("activities")
    .select("status, completed_at, responsible_id, branch_id, plan:plans(channel_id)")
    .eq("id", input.activityId)
    .maybeSingle();
  if (!activity?.plan) return { ok: false, error: "Atividade não encontrada." };

  const allowed = await canRegisterExecution(profile, {
    id: input.activityId,
    responsible_id: activity.responsible_id,
    branch_id: activity.branch_id,
    channel_id: activity.plan.channel_id,
  });
  if (!allowed) {
    return { ok: false, error: "Você não pode alterar esta atividade." };
  }
  if (activity.status === input.status) return { ok: true };

  const { error } = await supabase
    .from("activities")
    .update({
      status: input.status,
      completed_at:
        input.status === "concluida" ? new Date().toISOString() : null,
    })
    .eq("id", input.activityId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  const reopened =
    activity.status === "concluida" && input.status !== "concluida";
  await logEvent({
    activityId: input.activityId,
    profileId: profile.id,
    type: reopened ? "reaberta" : "status_alterado",
    description: reopened
      ? `Atividade reaberta (${STATUS_LABELS[input.status]}) por ${profile.fullName}`
      : `Status alterado de "${STATUS_LABELS[activity.status as ActivityStatus]}" para "${STATUS_LABELS[input.status]}" por ${profile.fullName}`,
  });

  revalidatePlanPages(activity.plan.channel_id, input.activityId);
  return { ok: true };
}

// ─── Fotos ───────────────────────────────────────────────────────────────────

/** Registra a foto já enviada ao bucket pelo client + evento na timeline. */
export async function registerActivityPhoto(input: {
  activityId: string;
  storagePath: string;
  caption?: string;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from("activities")
    .select("responsible_id, branch_id, plan:plans(channel_id)")
    .eq("id", input.activityId)
    .maybeSingle();
  if (!activity?.plan) return { ok: false, error: "Atividade não encontrada." };

  const allowed = await canRegisterExecution(profile, {
    id: input.activityId,
    responsible_id: activity.responsible_id,
    branch_id: activity.branch_id,
    channel_id: activity.plan.channel_id,
  });
  if (!allowed) {
    return { ok: false, error: "Você não pode anexar fotos nesta atividade." };
  }

  const { error } = await supabase.from("activity_photos").insert({
    activity_id: input.activityId,
    storage_path: input.storagePath,
    caption: input.caption || null,
  });
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logEvent({
    activityId: input.activityId,
    profileId: profile.id,
    type: "foto_adicionada",
    description: `Foto adicionada por ${profile.fullName}`,
  });

  revalidatePlanPages(activity.plan.channel_id, input.activityId);
  return { ok: true };
}

export async function deleteActivityPhoto(input: {
  photoId: string;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("activity_photos")
    .select(
      "storage_path, activity_id, activity:activities(responsible_id, branch_id, plan:plans(channel_id))"
    )
    .eq("id", input.photoId)
    .maybeSingle();
  if (!photo?.activity?.plan) {
    return { ok: false, error: "Foto não encontrada." };
  }

  const allowed = await canRegisterExecution(profile, {
    id: photo.activity_id,
    responsible_id: photo.activity.responsible_id,
    branch_id: photo.activity.branch_id,
    channel_id: photo.activity.plan.channel_id,
  });
  if (!allowed) {
    return { ok: false, error: "Você não pode remover fotos desta atividade." };
  }

  const { error } = await supabase
    .from("activity_photos")
    .delete()
    .eq("id", input.photoId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  if (!photo.storage_path.startsWith("seed/")) {
    await supabase.storage
      .from("activity-photos")
      .remove([photo.storage_path]);
  }

  await logEvent({
    activityId: photo.activity_id,
    profileId: profile.id,
    type: "foto_removida",
    description: `Foto removida por ${profile.fullName}`,
  });

  revalidatePlanPages(photo.activity.plan.channel_id, photo.activity_id);
  return { ok: true };
}
