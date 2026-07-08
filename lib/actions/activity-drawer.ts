"use server";

import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getActivityDetail, getPlanProblems } from "@/lib/db/channels";
import { isLateActivity } from "@/lib/db/status";

export async function getDrawerActivity(activityId: string) {
  const profile = await getCurrentProfile();
  const activity = await getActivityDetail(activityId);
  if (!activity) return null;

  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(activity.channelId)) return null;

  const planProblems = await getPlanProblems(activity.planId);

  const overdue =
    isLateActivity(activity) && activity.status !== "concluida";

  const needsProblemLink =
    activity.status === "concluida" &&
    activity.problemId === null &&
    planProblems.length > 0;

  return {
    ...activity,
    overdue,
    needsProblemLink,
    planProblems,
  };
}

export type DrawerActivity = NonNullable<
  Awaited<ReturnType<typeof getDrawerActivity>>
>;
