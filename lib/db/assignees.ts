import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados dos múltiplos responsáveis por atividade
 * (activity_assignees). A coluna activities.responsible_id continua
 * existindo por compatibilidade — quem escreve aqui deve mantê-la em
 * sincronia até a remoção definitiva.
 */

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

