import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

/**
 * O calendário deixou de ser rota própria — virou uma visão dentro de
 * Atividades / Minhas Atividades (ver ViewSwitch). Esta rota sobrevive
 * só para não quebrar links antigos: manda cada perfil para a sua lista,
 * onde a visão de calendário agora vive.
 */
export default async function CalendarioPage() {
  const profile = await getCurrentProfile();
  redirect(profile.role === "RTV" ? "/minhas-atividades" : "/atividades");
}
