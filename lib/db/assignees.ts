import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados dos múltiplos responsáveis por atividade
 * (activity_assignees). A coluna activities.responsible_id continua
 * existindo por compatibilidade — quem escreve aqui deve mantê-la em
 * sincronia até a remoção definitiva.
 */

export type AssigneeProfile = {
  id: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
};

/** Perfis responsáveis pela atividade, em ordem alfabética. */
export async function getAssignees(
  activityId: string
): Promise<AssigneeProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_assignees")
    .select("profile:profiles(id, full_name, role, avatar_url)")
    .eq("activity_id", activityId);

  if (error) throw error;

  return data
    .filter((row) => row.profile)
    .map((row) => ({
      id: row.profile!.id,
      fullName: row.profile!.full_name,
      role: row.profile!.role,
      avatarUrl: row.profile!.avatar_url,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/**
 * Substitui a lista de responsáveis da atividade pela lista informada
 * (remove os que saíram, insere os novos).
 */
export async function setAssignees(
  activityId: string,
  profileIds: string[]
): Promise<void> {
  const supabase = await createClient();
  const unique = [...new Set(profileIds)];

  const { error: deleteError } = await supabase
    .from("activity_assignees")
    .delete()
    .eq("activity_id", activityId)
    .not(
      "profile_id",
      "in",
      `(${unique.length > 0 ? unique.join(",") : "00000000-0000-0000-0000-000000000000"})`
    );
  if (deleteError) throw deleteError;

  if (unique.length === 0) return;

  const { error: insertError } = await supabase
    .from("activity_assignees")
    .upsert(
      unique.map((profileId) => ({
        activity_id: activityId,
        profile_id: profileId,
      })),
      { onConflict: "activity_id,profile_id", ignoreDuplicates: true }
    );
  if (insertError) throw insertError;
}

/** Adiciona um responsável (idempotente). */
export async function addAssignee(
  activityId: string,
  profileId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("activity_assignees").upsert(
    { activity_id: activityId, profile_id: profileId },
    { onConflict: "activity_id,profile_id", ignoreDuplicates: true }
  );
  if (error) throw error;
}

/** Remove um responsável. */
export async function removeAssignee(
  activityId: string,
  profileId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_assignees")
    .delete()
    .eq("activity_id", activityId)
    .eq("profile_id", profileId);
  if (error) throw error;
}
