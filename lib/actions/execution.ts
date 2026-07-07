"use server";

import { revalidatePath } from "next/cache";

import {
  isCategoryRequired,
  isDescriptionRequired,
} from "@/lib/activities/rules";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "@/lib/config";
import {
  canRegisterExecution,
  getCurrentProfile,
  getScopedBranchIds,
} from "@/lib/auth/scope";
import { logActivityEvent } from "@/lib/db/events";
import { createClient } from "@/lib/supabase/server";

/**
 * Server action do fluxo "Registrar execução" (Bloco 4).
 * As fotos já chegam enviadas ao bucket pelo client (comprimidas);
 * aqui validamos escopo, criamos o registro avulso quando for o caso,
 * gravamos as fotos/evento e atualizamos o status.
 */

const GENERIC_ERROR =
  "Não foi possível concluir o registro. Verifique o sinal e tente de novo.";

export type RegisterExecutionInput = {
  /** Atividade existente do plano (Situação A: abrir e concluir). */
  activityId?: string;
  /** Registro avulso (Situação B): filial onde a ação aconteceu. */
  adhocBranchId?: string;
  /**
   * O que foi feito. Obrigatória no avulso; opcional na atividade
   * planejada (o plano já descreve) — se vier diferente, atualiza a
   * descrição da atividade.
   */
  description: string;
  /** Categoria do registro avulso (obrigatória na Situação B). */
  category?: ActivityCategory;
  /** Problema do plano no registro avulso; null = "vincular depois". */
  problemId?: string | null;
  /** Marcar a atividade como concluída ao registrar. */
  markCompleted: boolean;
  /** Caminhos no bucket activity-photos, já enviados pelo client. */
  photoPaths: string[];
};

export type RegisterExecutionResult =
  | { ok: true; activityId: string; completed: boolean }
  | { ok: false; error: string };

/** Título do registro avulso: primeiras palavras da descrição. */
function titleFromDescription(description: string): string {
  const words = description.trim().split(/\s+/);
  const title = words.slice(0, 8).join(" ");
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

export async function registerExecution(
  input: RegisterExecutionInput
): Promise<RegisterExecutionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // Regras centrais (lib/activities/rules.ts): no registro avulso a
  // descrição é o mínimo obrigatório; na atividade planejada o plano já
  // descreve — ajustar é opcional. Foto nunca bloqueia o registro.
  const description = input.description.trim();
  if (!input.activityId && isDescriptionRequired() && !description) {
    return { ok: false, error: "Descreva o que foi feito antes de registrar." };
  }

  let activityId: string;
  let channelId: string;
  let completed: boolean;
  let photoCaption = description || null;

  if (input.activityId) {
    // ── Situação A: abrir a atividade planejada e concluir ─────────────
    const { data: activity } = await supabase
      .from("activities")
      .select(
        "id, title, description, status, responsible_id, branch_id, plan:plans(channel_id)"
      )
      .eq("id", input.activityId)
      .maybeSingle();
    if (!activity?.plan) {
      return { ok: false, error: "Atividade não encontrada." };
    }

    const allowed = await canRegisterExecution(profile, {
      responsible_id: activity.responsible_id,
      branch_id: activity.branch_id,
      channel_id: activity.plan.channel_id,
    });
    if (!allowed) {
      return {
        ok: false,
        error: "Você não pode registrar execução nesta atividade.",
      };
    }

    activityId = activity.id;
    channelId = activity.plan.channel_id;
    completed = input.markCompleted;
    photoCaption = description || activity.title;

    const updates: {
      status?: "concluida";
      completed_at?: string;
      description?: string;
    } = {};
    if (input.markCompleted && activity.status !== "concluida") {
      // completed_at automático — nunca digitado pelo usuário.
      updates.status = "concluida";
      updates.completed_at = new Date().toISOString();
    }
    // A realidade foi diferente do planejado: a descrição ajustada
    // substitui a planejada na própria atividade.
    if (description && description !== (activity.description ?? "")) {
      updates.description = description;
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("activities")
        .update(updates)
        .eq("id", activity.id);
      if (error) return { ok: false, error: GENERIC_ERROR };
    }
  } else if (input.adhocBranchId) {
    // ── Registro avulso: ação fora do plano ────────────────────────────
    const branchIds = await getScopedBranchIds(profile);
    if (!branchIds.includes(input.adhocBranchId)) {
      return { ok: false, error: "Você não atua nesta filial." };
    }

    const { data: branch } = await supabase
      .from("branches")
      .select("id, channel_id")
      .eq("id", input.adhocBranchId)
      .maybeSingle();
    if (!branch) return { ok: false, error: "Filial não encontrada." };

    // Categoria: obrigatória em toda criação (regra central).
    if (
      isCategoryRequired() &&
      (!input.category || !ACTIVITY_CATEGORIES.includes(input.category))
    ) {
      return { ok: false, error: "Selecione a categoria da ação." };
    }

    const { data: plan } = await supabase
      .from("plans")
      .select("id, problems(id)")
      .eq("channel_id", branch.channel_id)
      .eq("status", "ativo")
      .maybeSingle();
    if (!plan) {
      return {
        ok: false,
        error: "O canal desta filial não tem plano ativo nesta safra.",
      };
    }

    // Problema: se veio, precisa ser do plano do canal. null = pendência
    // "vincular depois" (derivada: concluída + plano com problemas).
    const planProblemIds = new Set(plan.problems.map((problem) => problem.id));
    if (input.problemId && !planProblemIds.has(input.problemId)) {
      return { ok: false, error: "Este problema não pertence ao plano do canal." };
    }

    const { data: created, error } = await supabase
      .from("activities")
      .insert({
        plan_id: plan.id,
        title: titleFromDescription(description),
        category: input.category,
        description,
        problem_id: input.problemId ?? null,
        branch_id: branch.id,
        responsible_id: profile.id,
        due_date: null,
        status: "concluida",
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: GENERIC_ERROR };

    activityId = created.id;
    channelId = branch.channel_id;
    completed = true;

    await logActivityEvent({
      activityId,
      profileId: profile.id,
      type: "criada",
      description: `Registro avulso (fora do plano) criado por ${profile.fullName}`,
    });
  } else {
    return { ok: false, error: "Escolha uma atividade ou o registro avulso." };
  }

  // ── Fotos (caption = descrição do registro ou título da atividade) ──
  if (input.photoPaths.length > 0) {
    const caption =
      photoCaption && photoCaption.length > 140
        ? `${photoCaption.slice(0, 137)}...`
        : photoCaption;
    const { error } = await supabase.from("activity_photos").insert(
      input.photoPaths.map((path) => ({
        activity_id: activityId,
        storage_path: path,
        caption,
      }))
    );
    if (error) return { ok: false, error: GENERIC_ERROR };
  }

  await logActivityEvent({
    activityId,
    profileId: profile.id,
    type: "execucao_registrada",
    description: description
      ? `Execução registrada por ${profile.fullName}: ${description}`
      : `Execução registrada por ${profile.fullName}`,
  });

  revalidatePath("/");
  revalidatePath("/minhas-atividades");
  revalidatePath("/atividades");
  revalidatePath(`/atividades/${activityId}`);
  revalidatePath("/canais");
  revalidatePath(`/canais/${channelId}`);
  revalidatePath("/registrar");

  return { ok: true, activityId, completed };
}
