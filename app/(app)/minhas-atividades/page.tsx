import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardPlus } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Button } from "@/components/ui/button";
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
      : "abertas";
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
      actions={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/registrar?avulso=1" />}
        >
          <ClipboardPlus className="size-4" />
          Registrar ação fora do plano
        </Button>
      }
    >
      <MyActivitiesList activities={mine} initialStatus={initialStatus} />
    </PageShell>
  );
}
