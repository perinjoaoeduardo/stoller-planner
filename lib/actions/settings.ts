"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/scope";
import { getUserLinksSummary, type UserLinksSummary } from "@/lib/db/settings";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Atualiza o nome do próprio usuário (Configurações → Perfil). */
export async function updateProfileName(
  fullName: string
): Promise<ActionResult> {
  const trimmed = fullName.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "O nome precisa de ao menos 3 caracteres." };
  }
  if (trimmed.length > 120) {
    return { ok: false, error: "O nome pode ter no máximo 120 caracteres." };
  }

  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", profile.id);

  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Grava a URL pública do avatar após o upload no bucket (o upload em
 * si acontece no client, direto pro Storage).
 */
export async function updateAvatarUrl(
  publicUrl: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;
  if (!publicUrl.startsWith(expectedPrefix)) {
    return { ok: false, error: "URL de avatar inválida." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", profile.id);

  if (error) {
    return { ok: false, error: "Não foi possível salvar a foto." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Vínculos do usuário logado, carregados quando o modal abre. */
export async function getMyLinks(): Promise<UserLinksSummary> {
  const profile = await getCurrentProfile();
  return getUserLinksSummary(profile);
}
