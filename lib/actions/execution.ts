"use server";

import { revalidatePath } from "next/cache";

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
  /** Atividade existente do plano (fluxo normal). */
  activityId?: string;
  /** Registro avulso: filial onde a ação aconteceu. */
  adhocBranchId?: string;
  description: string;
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

  const description = input.description.trim();
  if (!description) {
    return { ok: false, error: "Descreva o que foi feito antes de registrar." };
  }

  let activityId: string;
  let channelId: string;
  let completed: boolean;

  if (input.activityId) {
    // ── Fluxo normal: vincular a uma atividade do plano ────────────────
    const { data: activity } = await supabase
      .from("activities")
      .select(
        "id, status, responsible_id, branch_id, plan:plans(channel_id)"
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

    if (input.markCompleted && activity.status !== "concluida") {
      const { error } = await supabase
        .from("activities")
        .update({
          status: "concluida",
          completed_at: new Date().toISOString(),
        })
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

    const { data: plan } = await supabase
      .from("plans")
      .select("id")
      .eq("channel_id", branch.channel_id)
      .eq("status", "ativo")
      .maybeSingle();
    if (!plan) {
      return {
        ok: false,
        error: "O canal desta filial não tem plano ativo nesta safra.",
      };
    }

    const { data: created, error } = await supabase
      .from("activities")
      .insert({
        plan_id: plan.id,
        title: titleFromDescription(description),
        description,
        problem_id: null,
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

  // ── Fotos (caption = descrição do registro) ──────────────────────────
  if (input.photoPaths.length > 0) {
    const caption =
      description.length > 140 ? `${description.slice(0, 137)}...` : description;
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
    description: `Execução registrada por ${profile.fullName}: ${description}`,
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
