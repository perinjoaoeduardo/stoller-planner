import type { Metadata } from "next";
import { CalendarDays, ListTodo } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { ViewSwitch } from "@/components/app/view-switch";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getScopedActivities } from "@/lib/db/channels";
import { createClient } from "@/lib/supabase/server";

import { CalendarView } from "../calendario/calendar-view";
import { MyActivitiesList } from "./my-activities-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas Atividades — Corteva PED",
};

/**
 * "Minhas Atividades" — visão pessoal do RTV cross-canal: só atividades
 * em que ele é assignee. Duas visões do mesmo recorte, alternadas pelo
 * ViewSwitch: Lista (KPIs + tabela densa) e Calendário (a agenda da
 * safra). Não há mais rota /calendario separada.
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
  const [activities, channels] = await Promise.all([
    getScopedActivities(channelIds),
    getChannelList(channelIds),
  ]);

  const mine = activities.filter((activity) =>
    activity.assignees.some((assignee) => assignee.id === profile.id)
  );

  return (
    <PageShell
      title="Minhas Atividades"
      description="Todas as atividades atribuídas a você."
    >
      <ViewSwitch
        storageKey="minhas-atividades-view"
        views={[
          {
            key: "lista",
            label: "Lista",
            icon: <ListTodo className="size-4" />,
            node: (
              <MyActivitiesList activities={mine} initialStatus={initialStatus} />
            ),
          },
          {
            key: "calendario",
            label: "Calendário",
            icon: <CalendarDays className="size-4" />,
            node: <CalendarView activities={mine} channels={channels} />,
          },
        ]}
      />
    </PageShell>
  );
}

async function getChannelList(channelIds: string[]) {
  if (channelIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("channels")
    .select("id, name")
    .in("id", channelIds)
    .order("name");
  return data ?? [];
}
