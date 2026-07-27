"use server";

import { revalidatePath } from "next/cache";

import { canEditPlan, getCurrentProfile } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Actions do time do canal (não há RLS — a permissão vive aqui).
 *
 * Quem mexe: CX (vê e edita tudo) e o DSM do próprio canal — mesma régua
 * de `canEditPlan`. RTV não gerencia time.
 *
 * O vínculo em `user_links` tem dois formatos e a action escolhe pelo
 * PAPEL da pessoa, não por um seletor na tela: DSM responde pelo canal
 * inteiro (channel_id) e RTV atua por filial (branch_id). Deixar isso
 * como escolha do usuário só abriria espaço para vínculo sem sentido.
 */

const GENERIC_ERROR = "Não foi possível salvar. Tente de novo.";

async function guard(channelId: string) {
  const profile = await getCurrentProfile();
  const allowed = await canEditPlan(profile, channelId);
  return allowed ? profile : null;
}

function revalidateTeam(channelId: string) {
  revalidatePath(`/canais/${channelId}/pessoas`);
  revalidatePath(`/canais/${channelId}`);
  revalidatePath(`/meus-canais/${channelId}`);
}

/**
 * Coloca a pessoa no canal. DSM entra com um vínculo de canal; RTV entra
 * com um vínculo por filial escolhida (pelo menos uma).
 */
export async function addChannelPerson(input: {
  channelId: string;
  profileId: string;
  branchIds: string[];
}): Promise<ActionResult> {
  const actor = await guard(input.channelId);
  if (!actor) return { ok: false, error: "Você não pode editar este time." };

  const supabase = await createClient();
  const { data: person, error: personError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", input.profileId)
    .maybeSingle();

  if (personError) return { ok: false, error: GENERIC_ERROR };
  if (!person) return { ok: false, error: "Pessoa não encontrada." };
  if (person.role === "CX") {
    return {
      ok: false,
      error: "CX enxerga todos os canais — não precisa de vínculo.",
    };
  }

  const rows: {
    profile_id: string;
    channel_id: string | null;
    branch_id: string | null;
  }[] =
    person.role === "DSM"
      ? [{ profile_id: person.id, channel_id: input.channelId, branch_id: null }]
      : input.branchIds.map((branchId) => ({
          profile_id: person.id,
          channel_id: null,
          branch_id: branchId,
        }));

  if (rows.length === 0) {
    return { ok: false, error: "Escolha pelo menos uma filial." };
  }

  const { error } = await supabase.from("user_links").insert(rows);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateTeam(input.channelId);
  return { ok: true };
}

/**
 * Troca as filiais de um RTV neste canal: apaga os vínculos antigos DO
 * CANAL e grava os novos. Só mexe nas filiais deste canal — a pessoa
 * pode atuar em outros, e um "replace" global apagaria isso.
 */
export async function setPersonBranches(input: {
  channelId: string;
  profileId: string;
  branchIds: string[];
}): Promise<ActionResult> {
  const actor = await guard(input.channelId);
  if (!actor) return { ok: false, error: "Você não pode editar este time." };
  if (input.branchIds.length === 0) {
    return { ok: false, error: "Escolha pelo menos uma filial." };
  }

  const supabase = await createClient();
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("channel_id", input.channelId);

  if (branchError) return { ok: false, error: GENERIC_ERROR };

  const channelBranchIds = (branches ?? []).map((branch) => branch.id);
  const invalid = input.branchIds.filter(
    (id) => !channelBranchIds.includes(id)
  );
  if (invalid.length > 0) {
    return { ok: false, error: "Filial fora deste canal." };
  }

  const { error: deleteError } = await supabase
    .from("user_links")
    .delete()
    .eq("profile_id", input.profileId)
    .in("branch_id", channelBranchIds);

  if (deleteError) return { ok: false, error: GENERIC_ERROR };

  const { error: insertError } = await supabase.from("user_links").insert(
    input.branchIds.map((branchId) => ({
      profile_id: input.profileId,
      channel_id: null,
      branch_id: branchId,
    }))
  );

  if (insertError) return { ok: false, error: GENERIC_ERROR };

  revalidateTeam(input.channelId);
  return { ok: true };
}

/**
 * Tira a pessoa do canal apagando os vínculos daqui. As atividades já
 * atribuídas a ela NÃO mudam de dono — quem sai do time não some do
 * histórico; o gestor reatribui pela própria atividade.
 */
export async function removeChannelPerson(input: {
  channelId: string;
  linkIds: string[];
}): Promise<ActionResult> {
  const actor = await guard(input.channelId);
  if (!actor) return { ok: false, error: "Você não pode editar este time." };
  if (input.linkIds.length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_links")
    .delete()
    .in("id", input.linkIds);

  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateTeam(input.channelId);
  return { ok: true };
}
