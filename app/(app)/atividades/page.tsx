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
 * canal ou no detalhe da atividade. Usa o variant "global" da
 * ActivitiesTable — StatCards clicáveis + linha de controle enxuta.
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

  const channels = dedupe(
    activities.map((activity) => ({
      value: activity.channelId,
      label: activity.channelName,
    }))
  );
  // Responsáveis: união de responsibleId + assignees (o toggle "Só minhas"
  // e o filtro consideram ambos).
  const responsibleMap = new Map<string, SelectOption>();
  for (const activity of activities) {
    if (activity.responsibleId && activity.responsibleName) {
      responsibleMap.set(activity.responsibleId, {
        value: activity.responsibleId,
        label: activity.responsibleName,
      });
    }
    for (const assignee of activity.assignees) {
      if (!responsibleMap.has(assignee.id)) {
        responsibleMap.set(assignee.id, {
          value: assignee.id,
          label: assignee.name,
        });
      }
    }
  }
  const responsibles = [...responsibleMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  const isField = profile.role === "RTV";

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
        problems={[]}
        branches={[]}
        responsibles={responsibles}
        channels={channels}
        currentUserId={profile.id}
        canEdit={false}
        showChannel
        variant="global"
      />
    </PageShell>
  );
}
