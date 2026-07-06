import { createClient } from "@/lib/supabase/server";

export type ActivityEventType =
  | "criada"
  | "editada"
  | "status_alterado"
  | "foto_adicionada"
  | "foto_removida"
  | "execucao_registrada"
  | "reaberta";

/** Insere um marco na linha do tempo da atividade (best effort). */
export async function logActivityEvent(input: {
  activityId: string;
  profileId: string;
  type: ActivityEventType;
  description?: string;
}) {
  const supabase = await createClient();
  await supabase.from("activity_events").insert({
    activity_id: input.activityId,
    profile_id: input.profileId,
    type: input.type,
    description: input.description ?? null,
  });
}
