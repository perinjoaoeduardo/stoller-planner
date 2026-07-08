import type { Metadata } from "next";

import { NewActivityButton } from "@/components/app/new-activity-button";
import { PageShell } from "@/components/app/page-shell";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getScopedActivities } from "@/lib/db/channels";
import { createClient } from "@/lib/supabase/server";

import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendário — Corteva Planner",
};

export default async function CalendarioPage() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);

  const [activities, channels] = await Promise.all([
    getScopedActivities(channelIds),
    getChannelList(channelIds),
  ]);

  const mine = activities.filter((a) =>
    a.assignees.some((assignee) => assignee.id === profile.id)
  );

  return (
    <PageShell
      title="Calendário"
      description="Suas atividades ao longo da safra."
      actions={<NewActivityButton />}
    >
      <CalendarView activities={mine} channels={channels} />
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
