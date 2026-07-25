import type { ActivityStatus } from "@/components/shared/status-badge";
import type { ActivityCategory } from "@/lib/config";
import { getDisplayStatus } from "@/lib/db/status";
import {
  PENDENCY_LABELS,
  PENDENCY_TYPES,
  type PendencyType,
} from "@/lib/pendencias-shared";
import { createClient } from "@/lib/supabase/server";

// Re-exportados para não quebrar imports existentes de "@/lib/db/pendencias".
// Novos client components devem importar direto de "@/lib/pendencias-shared".
export { PENDENCY_LABELS, PENDENCY_TYPES };
export type { PendencyType };

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
 * seus canais, CX vê tudo. `mineProfileId` restringe às atividades da
 * própria pessoa (RTV): ele só consegue resolver as dele — mostrar as
 * dos outros seria ruído inacionável.
 */

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
  channelIds: string[],
  mineProfileId?: string
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
             responsible_id,
             branch:branches(name),
             responsible:profiles(full_name),
             assignees:activity_assignees(profile_id),
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
      // Escopo "minhas" (RTV): só o que ele consegue resolver — dele
      // como responsável (legado) ou como assignee.
      if (mineProfileId) {
        const isMine =
          activity.responsible_id === mineProfileId ||
          (activity.assignees ?? []).some(
            (assignee) => assignee.profile_id === mineProfileId
          );
        if (!isMine) continue;
      }

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
