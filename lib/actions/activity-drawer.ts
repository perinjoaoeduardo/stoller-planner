"use server";

import {
  canEditPlan,
  canRegisterExecution,
  getCurrentProfile,
  getScopedChannelIds,
} from "@/lib/auth/scope";
import { getActivityDetail, getPlanProblems } from "@/lib/db/channels";
import { isLateActivity } from "@/lib/db/status";

export async function getDrawerActivity(activityId: string) {
  const profile = await getCurrentProfile();
  const activity = await getActivityDetail(activityId);
  if (!activity) return null;

  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(activity.channelId)) return null;

  const [planProblems, canEdit, canRegister] = await Promise.all([
    getPlanProblems(activity.planId),
    canEditPlan(profile, activity.channelId),
    canRegisterExecution(profile, {
      id: activity.id,
      responsible_id: activity.responsibleId,
      branch_id: activity.branchId,
      channel_id: activity.channelId,
    }),
  ]);

  const overdue =
    isLateActivity(activity) && activity.status !== "concluida";

  const needsProblemLink =
    activity.status === "concluida" &&
    activity.problemId === null &&
    planProblems.length > 0;

  // RTV navega pelos "Meus Canais"; DSM/CX pelo cockpit denso.
  const isField = profile.role === "RTV";
  const channelHref = `${isField ? "/meus-canais" : "/canais"}/${activity.channelId}`;

  return {
    ...activity,
    overdue,
    needsProblemLink,
    planProblems,
    role: profile.role,
    canEdit,
    canRegister,
    channelHref,
  };
}

export type DrawerActivity = NonNullable<
  Awaited<ReturnType<typeof getDrawerActivity>>
>;
