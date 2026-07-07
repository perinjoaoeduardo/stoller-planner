import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/scope";
import {
  getBranchPlans,
  getFieldActivities,
  getMyChannels,
  OPEN_STATUSES,
} from "@/lib/db/execution";

import { RegisterFlow } from "./register-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrar execução — Corteva Planner",
};

/**
 * Fluxo "Registrar execução" — lógica invertida: abrir a atividade
 * planejada, anexar a foto por cima e concluir. Deep links:
 * /registrar?atividade=id abre a conclusão da atividade (Situação A);
 * /registrar?avulso=1 abre o registro fora do plano (Situação B).
 */
export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ atividade?: string; avulso?: string; canal?: string }>;
}) {
  const { atividade, avulso, canal } = await searchParams;
  const profile = await getCurrentProfile();
  const { activities, branchOptions } = await getFieldActivities(profile);
  const openActivities = activities.filter((activity) =>
    OPEN_STATUSES.includes(activity.status)
  );
  const [branchPlans, channels] = await Promise.all([
    getBranchPlans(branchOptions.map((branch) => branch.id)),
    getMyChannels(profile, openActivities),
  ]);

  const preselected = atividade
    ? (openActivities.find((activity) => activity.id === atividade) ?? null)
    : null;

  return (
    <RegisterFlow
      activities={openActivities}
      branches={branchOptions}
      branchPlans={branchPlans}
      channels={channels}
      preselectedId={preselected?.id ?? null}
      preselectedChannelId={canal ?? null}
      startAdhoc={avulso === "1" && !preselected}
    />
  );
}
