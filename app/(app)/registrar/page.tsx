import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/scope";
import { getFieldActivities, OPEN_STATUSES } from "@/lib/db/execution";

import { RegisterFlow } from "./register-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrar execução — Stoller Planner",
};

/**
 * Fluxo "Registrar execução" — a tela mais crítica do produto.
 * Desenhada para o RTV no campo (375px, poucos toques), mas funciona
 * para DSM e CX com o escopo deles. Deep link: /registrar?atividade=id
 * entra com a atividade já selecionada e pula o passo 2.
 */
export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ atividade?: string }>;
}) {
  const { atividade } = await searchParams;
  const profile = await getCurrentProfile();
  const { activities, branchOptions } = await getFieldActivities(profile);

  const openActivities = activities.filter((activity) =>
    OPEN_STATUSES.includes(activity.status)
  );
  const preselected = atividade
    ? (openActivities.find((activity) => activity.id === atividade) ?? null)
    : null;

  return (
    <RegisterFlow
      activities={openActivities}
      branches={branchOptions}
      preselectedId={preselected?.id ?? null}
    />
  );
}
