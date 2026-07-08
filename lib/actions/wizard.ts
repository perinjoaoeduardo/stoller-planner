"use server";

import { revalidatePath } from "next/cache";

import type { ActivityStatus } from "@/components/app/status-badge";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "@/lib/config";
import {
  getCurrentProfile,
  getScopedChannelIds,
} from "@/lib/auth/scope";
import { setAssignees } from "@/lib/db/assignees";
import {
  getChannelResponsibles,
  type ResponsibleOption,
} from "@/lib/db/channels";
import { logActivityEvent } from "@/lib/db/events";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

const GENERIC_ERROR =
  "Não foi possível concluir a ação. Tente novamente em instantes.";

// ── Fetch channels for the wizard picker ──────────────────────────────

export async function getWizardChannels() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  if (channelIds.length === 0) return [];

  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select(
      `id, name,
       plans(status, activities(id, status, due_date))`
    )
    .in("id", channelIds)
    .eq("plans.status", "ativo")
    .order("name");

  if (!channels) return [];

  const OPEN = ["planejada", "em_andamento"];
  return channels.map((ch) => {
    const activities = ch.plans[0]?.activities ?? [];
    const openCount = activities.filter((a) => {
      const display = getDisplayStatus({
        status: a.status as ActivityStatus,
        dueDate: a.due_date,
      });
      return OPEN.includes(display) || display === "atrasada";
    }).length;
    return { id: ch.id, name: ch.name, openActivityCount: openCount };
  });
}

// ── Fetch channel context (called client-side when channel is picked) ──

export type WizardActivity = {
  id: string;
  title: string;
  status: ActivityStatus;
  category: ActivityCategory | null;
  description: string | null;
  dueDate: string | null;
  branchId: string | null;
  branchName: string | null;
  channelId: string;
  channelName: string;
  problemTitle: string | null;
  assigneeCount: number;
  isMine: boolean;
};

export type WizardChannelContext = {
  planId: string | null;
  branches: { id: string; name: string }[];
  problems: { id: string; title: string }[];
  responsibles: ResponsibleOption[];
  openActivities: WizardActivity[];
};

const OPEN_STATUSES = ["planejada", "em_andamento", "atrasada"];

export async function getWizardChannelContext(
  channelId: string
): Promise<WizardChannelContext> {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(channelId)) {
    return {
      planId: null,
      branches: [],
      problems: [],
      responsibles: [],
      openActivities: [],
    };
  }

  const supabase = await createClient();

  const { data: channel } = await supabase
    .from("channels")
    .select(
      `id, name,
       branches(id, name),
       plans(id, status, problems(id, title, order_index),
             activities(id, title, category, description, status, due_date,
                        branch_id, branch:branches(name),
                        problem:problems(title),
                        responsible_id,
                        assignees:activity_assignees(profile_id)))`
    )
    .eq("id", channelId)
    .eq("plans.status", "ativo")
    .maybeSingle();

  if (!channel) {
    return {
      planId: null,
      branches: [],
      problems: [],
      responsibles: [],
      openActivities: [],
    };
  }

  const plan = channel.plans[0];
  const branches = channel.branches
    .map((b) => ({ id: b.id, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const responsibles = await getChannelResponsibles(
    channelId,
    branches.map((b) => b.id)
  );

  const rawActivities = plan?.activities ?? [];
  const openActivities: WizardActivity[] = rawActivities
    .filter((a) => {
      const display = getDisplayStatus({
        status: a.status as ActivityStatus,
        dueDate: a.due_date,
      });
      return OPEN_STATUSES.includes(display);
    })
    .map((a) => ({
      id: a.id,
      title: a.title,
      status: getDisplayStatus({
        status: a.status as ActivityStatus,
        dueDate: a.due_date,
      }),
      category: (a.category as ActivityCategory) ?? null,
      description: a.description,
      dueDate: a.due_date,
      branchId: a.branch_id,
      branchName: a.branch?.name ?? null,
      channelId: channel.id,
      channelName: channel.name,
      problemTitle: a.problem?.title ?? null,
      assigneeCount: a.assignees?.length ?? (a.responsible_id ? 1 : 0),
      isMine:
        a.responsible_id === profile.id ||
        (a.assignees?.some((aa) => aa.profile_id === profile.id) ?? false),
    }))
    .sort((a, b) => {
      const rank = (s: string) =>
        s === "atrasada" ? 0 : s === "em_andamento" ? 1 : 2;
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
      if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
      const da = a.dueDate ?? "9999-12-31";
      const db = b.dueDate ?? "9999-12-31";
      return da < db ? -1 : da > db ? 1 : 0;
    });

  return {
    planId: plan?.id ?? null,
    branches,
    problems: (plan?.problems ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((p) => ({ id: p.id, title: p.title })),
    responsibles,
    openActivities,
  };
}

// ── Schedule activity (PA2) ────────────────────────────────────────────

export type ScheduleActivityInput = {
  channelId: string;
  title: string;
  category: ActivityCategory;
  description?: string;
  problemId?: string | null;
  branchId?: string | null;
  assigneeIds: string[];
  dueDate: string;
};

export type ScheduleResult =
  | { ok: true; activityId: string }
  | { ok: false; error: string };

export async function scheduleActivity(
  input: ScheduleActivityInput
): Promise<ScheduleResult> {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(input.channelId)) {
    return { ok: false, error: "Você não atua neste canal." };
  }

  if (!input.title.trim()) {
    return { ok: false, error: "Informe o título da atividade." };
  }
  if (!ACTIVITY_CATEGORIES.includes(input.category)) {
    return { ok: false, error: "Selecione o tipo de ação." };
  }
  if (!input.dueDate) {
    return { ok: false, error: "Informe o prazo da atividade." };
  }

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("plans")
    .select("id, problems(id)")
    .eq("channel_id", input.channelId)
    .eq("status", "ativo")
    .maybeSingle();

  if (!plan) {
    return { ok: false, error: "O canal não tem plano ativo nesta safra." };
  }

  if (input.problemId) {
    const planProblemIds = new Set(plan.problems.map((p) => p.id));
    if (!planProblemIds.has(input.problemId)) {
      return { ok: false, error: "Esta meta não pertence ao plano do canal." };
    }
  }

  const { data: created, error } = await supabase
    .from("activities")
    .insert({
      plan_id: plan.id,
      title: input.title.trim(),
      category: input.category,
      description: input.description?.trim() || null,
      problem_id: input.problemId ?? null,
      branch_id: input.branchId ?? null,
      responsible_id: input.assigneeIds[0] ?? profile.id,
      due_date: input.dueDate,
      status: "planejada",
      completed_at: null,
    })
    .select("id")
    .single();

  if (error || !created) return { ok: false, error: GENERIC_ERROR };

  const assignees =
    input.assigneeIds.length > 0 ? input.assigneeIds : [profile.id];
  await setAssignees(created.id, assignees);

  await logActivityEvent({
    activityId: created.id,
    profileId: profile.id,
    type: "criada",
    description: `Atividade agendada por ${profile.fullName}`,
  });

  revalidatePath("/");
  revalidatePath("/minhas-atividades");
  revalidatePath("/atividades");
  revalidatePath(`/atividades/${created.id}`);
  revalidatePath("/canais");
  revalidatePath(`/canais/${input.channelId}`);
  revalidatePath("/meus-canais");
  revalidatePath(`/meus-canais/${input.channelId}`);

  return { ok: true, activityId: created.id };
}
