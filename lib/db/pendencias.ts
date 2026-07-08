import type { ActivityStatus } from "@/components/app/status-badge";
import type { ActivityCategory } from "@/lib/config";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de faxina (pendências): transforma registro cru do campo em
 * plano organizado. Três tipos de débito, calculados aqui e nunca nos
 * componentes:
 * - sem_foto      → atividade concluída sem nenhuma linha em
 *                   activity_photos
 * - sem_problema  → atividade concluída com problem_id nulo em plano
 *                   que TEM problemas (o "vincular depois")
 * - sem_categoria → atividade sem categoria (legado anterior à regra)
 *
 * O chamador é responsável pelo escopo (getScopedChannelIds): DSM vê os
 * seus canais, CX vê tudo.
 */

export const PENDENCY_TYPES = [
  "sem_foto",
  "sem_problema",
  "sem_categoria",
] as const;

export type PendencyType = (typeof PENDENCY_TYPES)[number];

export const PENDENCY_LABELS: Record<PendencyType, string> = {
  sem_foto: "Sem foto",
  sem_problema: "Sem meta vinculada",
  sem_categoria: "Sem categoria",
};

export type PendencyActivity = {
  id: string;
  title: string;
  status: ActivityStatus;
  category: ActivityCategory | null;
  dueDate: string | null;
  branchName: string | null;
  responsibleName: string | null;
  issues: PendencyType[];
};

export type ChannelPendencies = {
  channelId: string;
  channelName: string;
  regionName: string;
  dsmName: string | null;
  /** Total de pendências (uma atividade pode ter mais de uma). */
  total: number;
  countsByType: Record<PendencyType, number>;
  activities: PendencyActivity[];
};

export type PendenciesSummary = {
  totalsByType: Record<PendencyType, number>;
  total: number;
  channels: ChannelPendencies[];
};

/** Pendências dos canais do escopo, agrupadas por canal (piores primeiro). */
export async function getPendencies(
  channelIds: string[]
): Promise<PendenciesSummary> {
  const empty: PendenciesSummary = {
    totalsByType: { sem_foto: 0, sem_problema: 0, sem_categoria: 0 },
    total: 0,
    channels: [],
  };
  if (channelIds.length === 0) return empty;

  const supabase = await createClient();
  const [channelsRes, dsmRes] = await Promise.all([
    supabase
      .from("channels")
      .select(
        `id, name, region:regions(name),
         plans(id, status,
           problems(id),
           activities(id, title, status, category, due_date, problem_id,
             branch:branches(name),
             responsible:profiles(full_name),
             photos:activity_photos(id)))`
      )
      .in("id", channelIds)
      .eq("plans.status", "ativo")
      .order("name"),
    supabase
      .from("user_links")
      .select("channel_id, profile:profiles(full_name, role)")
      .in("channel_id", channelIds),
  ]);

  if (channelsRes.error) throw channelsRes.error;
  if (dsmRes.error) throw dsmRes.error;

  const dsmByChannel = new Map<string, string>();
  for (const link of dsmRes.data) {
    if (link.channel_id && link.profile?.role === "DSM") {
      dsmByChannel.set(link.channel_id, link.profile.full_name);
    }
  }

  const channels: ChannelPendencies[] = [];
  const totalsByType: Record<PendencyType, number> = {
    sem_foto: 0,
    sem_problema: 0,
    sem_categoria: 0,
  };

  for (const channel of channelsRes.data) {
    const plan = channel.plans[0];
    if (!plan) continue;
    const planHasProblems = plan.problems.length > 0;

    const countsByType: Record<PendencyType, number> = {
      sem_foto: 0,
      sem_problema: 0,
      sem_categoria: 0,
    };
    const activities: PendencyActivity[] = [];

    for (const activity of plan.activities) {
      const issues: PendencyType[] = [];
      const isCompleted = activity.status === "concluida";

      if (isCompleted && activity.photos.length === 0) {
        issues.push("sem_foto");
      }
      if (isCompleted && !activity.problem_id && planHasProblems) {
        issues.push("sem_problema");
      }
      if (!activity.category) {
        issues.push("sem_categoria");
      }
      if (issues.length === 0) continue;

      for (const issue of issues) {
        countsByType[issue] += 1;
        totalsByType[issue] += 1;
      }
      activities.push({
        id: activity.id,
        title: activity.title,
        status: getDisplayStatus({
          status: activity.status as ActivityStatus,
          dueDate: activity.due_date,
        }),
        category: activity.category as ActivityCategory | null,
        dueDate: activity.due_date,
        branchName: activity.branch?.name ?? null,
        responsibleName: activity.responsible?.full_name ?? null,
        issues,
      });
    }

    if (activities.length === 0) continue;

    // Mais pendências primeiro dentro do canal; título como desempate.
    activities.sort(
      (a, b) =>
        b.issues.length - a.issues.length || a.title.localeCompare(b.title)
    );

    channels.push({
      channelId: channel.id,
      channelName: channel.name,
      regionName: channel.region?.name ?? "—",
      dsmName: dsmByChannel.get(channel.id) ?? null,
      total:
        countsByType.sem_foto +
        countsByType.sem_problema +
        countsByType.sem_categoria,
      countsByType,
      activities,
    });
  }

  channels.sort(
    (a, b) => b.total - a.total || a.channelName.localeCompare(b.channelName)
  );

  return {
    totalsByType,
    total:
      totalsByType.sem_foto +
      totalsByType.sem_problema +
      totalsByType.sem_categoria,
    channels,
  };
}
