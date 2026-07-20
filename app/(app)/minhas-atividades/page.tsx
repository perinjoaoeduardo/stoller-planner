import type { Metadata } from "next";

import { NewActivityButton } from "@/components/app/new-activity-button";
import { PageShell } from "@/components/app/page-shell";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getScopedActivities } from "@/lib/db/channels";

import { MyActivitiesList } from "./my-activities-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas Atividades — Corteva Planner",
};

/**
 * "Minhas Atividades" — visão pessoal do RTV cross-canal: só atividades
 * em que ele é assignee, com métricas, filtros ricos e agrupamento por
 * canal quando faz sentido.
 */
export default async function MinhasAtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const initialStatus =
    status === "abertas" ||
    status === "concluidas" ||
    status === "atrasadas" ||
    status === "todas"
      ? status
      : "todas";
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const activities = await getScopedActivities(channelIds);

  const mine = activities.filter((activity) =>
    activity.assignees.some((assignee) => assignee.id === profile.id)
  );

  return (
    <PageShell
      title="Minhas Atividades"
      description="Todas as atividades atribuídas a você."
      actions={<NewActivityButton />}
    >
      <MyActivitiesList activities={mine} initialStatus={initialStatus} />
    </PageShell>
  );
}
