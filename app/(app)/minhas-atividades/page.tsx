import type { Metadata } from "next";
import { PageShell } from "@/components/app/page-shell";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getScopedActivities } from "@/lib/db/channels";

import { MyActivitiesList } from "./my-activities-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas Atividades — Corteva Planner",
};

/**
 * "Minhas Atividades" = visão pessoal do RTV/RDC: só atividades em que
 * ele é responsável (assignee), agrupadas por canal. Mobile-first,
 * lista vertical de cards — este perfil não precisa de tabela.
 */
export default async function MinhasAtividadesPage() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const activities = await getScopedActivities(channelIds);

  const mine = activities.filter((activity) =>
    activity.assignees.some((assignee) => assignee.id === profile.id)
  );

  return (
    <PageShell
      title="Minhas Atividades"
      description="Atividades atribuídas a você em todos os canais."
    >
      <MyActivitiesList activities={mine} />
    </PageShell>
  );
}
