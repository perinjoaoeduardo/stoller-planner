import type { Metadata } from "next";
import { ActivitiesTable } from "@/components/app/activities-table";
import { PageShell } from "@/components/app/page-shell";
import type { SelectOption } from "@/components/app/searchable-select";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getScopedActivities } from "@/lib/db/channels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Atividades — Corteva Planner",
};

/**
 * Versão global da tabela de atividades: cruza todos os canais do escopo
 * do usuário, com a coluna extra "Canal". Edição acontece na página do
 * canal ou no detalhe da atividade.
 */
export default async function AtividadesPage() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const activities = await getScopedActivities(channelIds);

  const dedupe = (options: SelectOption[]) => {
    const seen = new Map<string, SelectOption>();
    for (const option of options) {
      if (!seen.has(option.value)) seen.set(option.value, option);
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  };

  const problems = dedupe(
    activities
      .filter((activity) => activity.problemId && activity.problemTitle)
      .map((activity) => ({
        value: activity.problemId!,
        label: activity.problemTitle!,
      }))
  );
  const branches = dedupe(
    activities
      .filter((activity) => activity.branchId && activity.branchName)
      .map((activity) => ({
        value: activity.branchId!,
        label: activity.branchName!,
      }))
  );
  const responsibles = dedupe(
    activities
      .filter((activity) => activity.responsibleId && activity.responsibleName)
      .map((activity) => ({
        value: activity.responsibleId!,
        label: activity.responsibleName!,
      }))
  );

  const isField = profile.role === "RTV" || profile.role === "RDC";

  return (
    <PageShell
      title={isField ? "Minhas Atividades" : "Atividades"}
      description={
        isField
          ? "Todas as atividades dos canais em que você atua."
          : "Todas as atividades dos seus canais na safra, em um só lugar."
      }
    >
      <ActivitiesTable
        data={activities}
        problems={problems}
        branches={branches}
        responsibles={responsibles}
        canEdit={false}
        showChannel
      />
    </PageShell>
  );
}
