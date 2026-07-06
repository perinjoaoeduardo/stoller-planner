import { cache } from "react";
import { differenceInCalendarDays, parseISO, startOfWeek } from "date-fns";

import type { ActivityStatus } from "@/components/app/status-badge";
import type { Role } from "@/lib/auth/nav";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import { computeHealth, type ChannelHealth } from "@/lib/plan-utils";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados da VISÃO CX (Bloco 5).
 * O CX enxerga tudo: estas funções carregam o snapshot nacional uma vez
 * por request (React cache) e derivam painel, regiões, saúde por canal,
 * canais no escuro e visão de pessoas a partir dele — a regra dos 21
 * dias (DARK_CHANNEL_DAYS) e o status derivado (getDisplayStatus) são
 * aplicados aqui, nunca nos componentes.
 */

// ---------------------------------------------------------------------------
// Snapshot nacional
// ---------------------------------------------------------------------------

type SnapshotActivity = {
  id: string;
  title: string;
  status: ActivityStatus;
  rawStatus: ActivityStatus;
  dueDate: string | null;
  responsibleId: string | null;
};

type SnapshotChannel = {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  hasActivePlan: boolean;
  activities: SnapshotActivity[];
  dsm: { id: string; name: string } | null;
  /** ISO do último evento execucao_registrada do canal (null = nunca). */
  lastExecutionAt: string | null;
};

type SnapshotProfile = {
  id: string;
  name: string;
  role: Role;
  channelIds: string[];
  branchNames: string[];
  channelNames: string[];
  regionIds: string[];
  lastExecutionAt: string | null;
};

type ExecutionEvent = { createdAt: string; channelId: string | null };

export type CxSnapshot = {
  channels: SnapshotChannel[];
  totalChannels: number;
  profiles: SnapshotProfile[];
  executionEvents: ExecutionEvent[];
};

/** Carrega tudo que a visão CX precisa, uma vez por request. */
export const getCxSnapshot = cache(async (): Promise<CxSnapshot> => {
  const supabase = await createClient();

  const [channelsRes, linksRes, eventsRes] = await Promise.all([
    supabase
      .from("channels")
      .select(
        `id, name, region:regions(id, name),
         branches(id, name),
         plans(id, status,
           activities(id, title, status, due_date, responsible_id))`
      )
      .order("name"),
    supabase
      .from("user_links")
      .select(
        `channel_id, branch_id,
         profile:profiles(id, full_name, role),
         branch:branches(id, name, channel_id)`
      ),
    supabase
      .from("activity_events")
      .select(
        `created_at, profile_id,
         activity:activities(plan:plans(channel_id))`
      )
      .eq("type", "execucao_registrada")
      .order("created_at", { ascending: false }),
  ]);

  if (channelsRes.error) throw channelsRes.error;
  if (linksRes.error) throw linksRes.error;
  if (eventsRes.error) throw eventsRes.error;

  // Último registro de execução por canal e por pessoa
  const lastByChannel = new Map<string, string>();
  const lastByProfile = new Map<string, string>();
  const executionEvents: ExecutionEvent[] = [];
  for (const event of eventsRes.data) {
    const channelId = event.activity?.plan?.channel_id ?? null;
    executionEvents.push({ createdAt: event.created_at, channelId });
    if (channelId && !lastByChannel.has(channelId)) {
      lastByChannel.set(channelId, event.created_at);
    }
    if (event.profile_id && !lastByProfile.has(event.profile_id)) {
      lastByProfile.set(event.profile_id, event.created_at);
    }
  }

  // DSM responsável por canal (via user_links de canal)
  const dsmByChannel = new Map<string, { id: string; name: string }>();
  for (const link of linksRes.data) {
    if (link.channel_id && link.profile?.role === "DSM") {
      dsmByChannel.set(link.channel_id, {
        id: link.profile.id,
        name: link.profile.full_name,
      });
    }
  }

  const channels: SnapshotChannel[] = channelsRes.data.map((channel) => {
    const activePlan = channel.plans.find((plan) => plan.status === "ativo");
    const activities: SnapshotActivity[] = (activePlan?.activities ?? []).map(
      (activity) => ({
        id: activity.id,
        title: activity.title,
        rawStatus: activity.status as ActivityStatus,
        status: getDisplayStatus({
          status: activity.status as ActivityStatus,
          dueDate: activity.due_date,
        }),
        dueDate: activity.due_date,
        responsibleId: activity.responsible_id,
      })
    );
    return {
      id: channel.id,
      name: channel.name,
      regionId: channel.region?.id ?? "",
      regionName: channel.region?.name ?? "—",
      hasActivePlan: !!activePlan,
      activities,
      dsm: dsmByChannel.get(channel.id) ?? null,
      lastExecutionAt: lastByChannel.get(channel.id) ?? null,
    };
  });

  const channelById = new Map(channels.map((channel) => [channel.id, channel]));

  // Perfis com vínculos consolidados (DSM por canal, RTV/RDC por filial)
  const profileMap = new Map<string, SnapshotProfile>();
  for (const link of linksRes.data) {
    if (!link.profile) continue;
    let entry = profileMap.get(link.profile.id);
    if (!entry) {
      entry = {
        id: link.profile.id,
        name: link.profile.full_name,
        role: link.profile.role as Role,
        channelIds: [],
        branchNames: [],
        channelNames: [],
        regionIds: [],
        lastExecutionAt: lastByProfile.get(link.profile.id) ?? null,
      };
      profileMap.set(link.profile.id, entry);
    }
    const channelId = link.channel_id ?? link.branch?.channel_id ?? null;
    if (channelId && !entry.channelIds.includes(channelId)) {
      entry.channelIds.push(channelId);
      const channel = channelById.get(channelId);
      if (channel) {
        entry.channelNames.push(channel.name);
        if (!entry.regionIds.includes(channel.regionId)) {
          entry.regionIds.push(channel.regionId);
        }
      }
    }
    if (link.branch?.name && !entry.branchNames.includes(link.branch.name)) {
      entry.branchNames.push(link.branch.name);
    }
  }

  return {
    channels,
    totalChannels: channels.length,
    profiles: [...profileMap.values()],
    executionEvents,
  };
});

// ---------------------------------------------------------------------------
// Helpers de tempo
// ---------------------------------------------------------------------------

/** Dias corridos desde um timestamp ISO (null = nunca). */
export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return differenceInCalendarDays(new Date(), parseISO(iso));
}

/** Canal/pessoa conta como "no escuro": nunca registrou ou > limite. */
export function isDark(lastExecutionAt: string | null): boolean {
  const days = daysSince(lastExecutionAt);
  return days === null || days > DARK_CHANNEL_DAYS;
}

// ---------------------------------------------------------------------------
// Métricas (painel nacional e por região)
// ---------------------------------------------------------------------------

export type CxMetrics = {
  channelsWithPlan: number;
  totalChannels: number;
  totalActivities: number;
  completedCount: number;
  completedPercent: number;
  lateCount: number;
  latePercent: number;
  darkChannelCount: number;
};

function computeMetrics(channels: SnapshotChannel[]): CxMetrics {
  const activities = channels.flatMap((channel) => channel.activities);
  const total = activities.length;
  const completed = activities.filter(
    (activity) => activity.status === "concluida"
  ).length;
  const late = activities.filter(
    (activity) => activity.status === "atrasada"
  ).length;
  return {
    channelsWithPlan: channels.filter((channel) => channel.hasActivePlan)
      .length,
    totalChannels: channels.length,
    totalActivities: total,
    completedCount: completed,
    completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    lateCount: late,
    latePercent: total > 0 ? Math.round((late / total) * 100) : 0,
    darkChannelCount: channels.filter((channel) =>
      isDark(channel.lastExecutionAt)
    ).length,
  };
}

/** Métricas nacionais do painel /visao-geral. */
export async function getCxMetrics(): Promise<CxMetrics> {
  const snapshot = await getCxSnapshot();
  return computeMetrics(snapshot.channels);
}

// ---------------------------------------------------------------------------
// Gráficos do painel
// ---------------------------------------------------------------------------

export type RegionStatusDatum = {
  region: string;
  concluida: number;
  em_andamento: number;
  planejada: number;
  atrasada: number;
  nao_feita: number;
};

/** Atividades por região, quebradas por status derivado (barras empilhadas). */
export async function getRegionStatusData(): Promise<RegionStatusDatum[]> {
  const snapshot = await getCxSnapshot();
  const byRegion = new Map<string, RegionStatusDatum>();
  for (const channel of snapshot.channels) {
    let entry = byRegion.get(channel.regionId);
    if (!entry) {
      entry = {
        region: channel.regionName.replace(/^Regional\s+/i, ""),
        concluida: 0,
        em_andamento: 0,
        planejada: 0,
        atrasada: 0,
        nao_feita: 0,
      };
      byRegion.set(channel.regionId, entry);
    }
    for (const activity of channel.activities) {
      entry[activity.status] += 1;
    }
  }
  return [...byRegion.values()].sort((a, b) =>
    a.region.localeCompare(b.region)
  );
}

export type PulseDatum = { weekStart: string; total: number };

/** Registros de execução por semana, últimas N semanas (pulsação). */
export async function getExecutionPulse(weeks = 12): Promise<PulseDatum[]> {
  const snapshot = await getCxSnapshot();
  const buckets: PulseDatum[] = [];
  const index = new Map<string, PulseDatum>();
  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - i * 7);
    const key = start.toISOString().slice(0, 10);
    const datum = { weekStart: key, total: 0 };
    buckets.push(datum);
    index.set(key, datum);
  }
  for (const event of snapshot.executionEvents) {
    const key = startOfWeek(parseISO(event.createdAt), { weekStartsOn: 1 })
      .toISOString()
      .slice(0, 10);
    const datum = index.get(key);
    if (datum) datum.total += 1;
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Saúde por canal (tabela reusada em /visao-geral e /regioes/[id])
// ---------------------------------------------------------------------------

export type ChannelHealthRow = {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  dsmId: string | null;
  dsmName: string | null;
  activityCount: number;
  completedCount: number;
  completedPercent: number;
  lateCount: number;
  lastExecutionAt: string | null;
  daysSinceExecution: number | null;
  health: ChannelHealth;
};

/**
 * Linhas da tabela "Saúde por canal", já ordenadas dos piores para os
 * melhores: sem registro há mais tempo primeiro (nunca = pior de todos),
 * empate decidido pela saúde.
 */
export async function getChannelHealthRows(
  regionId?: string
): Promise<ChannelHealthRow[]> {
  const snapshot = await getCxSnapshot();
  const healthOrder: Record<ChannelHealth, number> = {
    critico: 0,
    atencao: 1,
    em_dia: 2,
  };
  return snapshot.channels
    .filter((channel) => !regionId || channel.regionId === regionId)
    .map((channel) => {
      const total = channel.activities.length;
      const completed = channel.activities.filter(
        (activity) => activity.status === "concluida"
      ).length;
      const late = channel.activities.filter(
        (activity) => activity.status === "atrasada"
      ).length;
      return {
        id: channel.id,
        name: channel.name,
        regionId: channel.regionId,
        regionName: channel.regionName,
        dsmId: channel.dsm?.id ?? null,
        dsmName: channel.dsm?.name ?? null,
        activityCount: total,
        completedCount: completed,
        completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        lateCount: late,
        lastExecutionAt: channel.lastExecutionAt,
        daysSinceExecution: daysSince(channel.lastExecutionAt),
        health: computeHealth(late, total),
      } satisfies ChannelHealthRow;
    })
    .sort(
      (a, b) =>
        (b.daysSinceExecution ?? Number.POSITIVE_INFINITY) -
          (a.daysSinceExecution ?? Number.POSITIVE_INFINITY) ||
        healthOrder[a.health] - healthOrder[b.health] ||
        a.name.localeCompare(b.name)
    );
}

// ---------------------------------------------------------------------------
// Regiões
// ---------------------------------------------------------------------------

export type RegionCard = {
  id: string;
  name: string;
  channelCount: number;
  dsmCount: number;
  totalActivities: number;
  completedPercent: number;
  lateCount: number;
  darkChannelCount: number;
  /** Pior saúde entre os canais da região (indicador agregado). */
  health: ChannelHealth;
};

/** Cards da página /regioes, um por região. */
export async function getRegionCards(): Promise<RegionCard[]> {
  const snapshot = await getCxSnapshot();
  const byRegion = new Map<string, SnapshotChannel[]>();
  for (const channel of snapshot.channels) {
    const list = byRegion.get(channel.regionId) ?? [];
    list.push(channel);
    byRegion.set(channel.regionId, list);
  }
  const healthOrder: Record<ChannelHealth, number> = {
    critico: 0,
    atencao: 1,
    em_dia: 2,
  };
  return [...byRegion.entries()]
    .map(([regionId, channels]) => {
      const metrics = computeMetrics(channels);
      const dsmIds = new Set(
        channels
          .map((channel) => channel.dsm?.id)
          .filter((id): id is string => !!id)
      );
      const worst = channels
        .map((channel) =>
          computeHealth(
            channel.activities.filter(
              (activity) => activity.status === "atrasada"
            ).length,
            channel.activities.length
          )
        )
        .sort((a, b) => healthOrder[a] - healthOrder[b])[0];
      return {
        id: regionId,
        name: channels[0].regionName,
        channelCount: channels.length,
        dsmCount: dsmIds.size,
        totalActivities: metrics.totalActivities,
        completedPercent: metrics.completedPercent,
        lateCount: metrics.lateCount,
        darkChannelCount: metrics.darkChannelCount,
        health: worst ?? "em_dia",
      } satisfies RegionCard;
    })
    .sort(
      (a, b) =>
        healthOrder[a.health] - healthOrder[b.health] ||
        a.name.localeCompare(b.name)
    );
}

export type RegionDsm = {
  id: string;
  name: string;
  channelCount: number;
  completedPercent: number;
};

export type RegionDetail = {
  id: string;
  name: string;
  metrics: CxMetrics;
  dsms: RegionDsm[];
};

/** Cabeçalho + métricas + DSMs da página /regioes/[id]. */
export async function getRegionDetail(
  regionId: string
): Promise<RegionDetail | null> {
  const snapshot = await getCxSnapshot();
  const channels = snapshot.channels.filter(
    (channel) => channel.regionId === regionId
  );
  if (channels.length === 0) return null;

  const byDsm = new Map<string, { name: string; channels: SnapshotChannel[] }>();
  for (const channel of channels) {
    if (!channel.dsm) continue;
    const entry = byDsm.get(channel.dsm.id) ?? {
      name: channel.dsm.name,
      channels: [],
    };
    entry.channels.push(channel);
    byDsm.set(channel.dsm.id, entry);
  }

  return {
    id: regionId,
    name: channels[0].regionName,
    metrics: computeMetrics(channels),
    dsms: [...byDsm.entries()]
      .map(([id, entry]) => {
        const activities = entry.channels.flatMap(
          (channel) => channel.activities
        );
        const completed = activities.filter(
          (activity) => activity.status === "concluida"
        ).length;
        return {
          id,
          name: entry.name,
          channelCount: entry.channels.length,
          completedPercent:
            activities.length > 0
              ? Math.round((completed / activities.length) * 100)
              : 0,
        } satisfies RegionDsm;
      })
      .sort((a, b) => a.completedPercent - b.completedPercent),
  };
}

// ---------------------------------------------------------------------------
// Acompanhamento — canais no escuro e pessoas
// ---------------------------------------------------------------------------

export type DarkChannel = {
  id: string;
  name: string;
  regionName: string;
  dsmName: string | null;
  daysSinceExecution: number | null;
  lateCount: number;
  openActivities: { id: string; title: string; status: ActivityStatus }[];
  /** Texto pronto do "Copiar resumo" (WhatsApp/Teams). */
  summaryText: string;
};

const OPEN_STATUSES: ActivityStatus[] = [
  "atrasada",
  "em_andamento",
  "planejada",
];

function buildSummaryText(input: {
  firstName: string | null;
  channelName: string;
  days: number | null;
  lateCount: number;
}): string {
  const greeting = input.firstName ? `Oi ${input.firstName}! ` : "Oi! ";
  const silence =
    input.days === null
      ? `${input.channelName} ainda não tem nenhum registro de execução nesta safra`
      : `${input.channelName} está sem registros há ${input.days} ${
          input.days === 1 ? "dia" : "dias"
        }`;
  const late =
    input.lateCount === 1
      ? "1 atividade atrasada"
      : `${input.lateCount} atividades atrasadas`;
  return `${greeting}Vi aqui no Stoller Planner que ${silence} e tem ${late}. Consegue dar uma atualizada?`;
}

/** Canais sem registro de execução há mais de DARK_CHANNEL_DAYS dias. */
export async function getDarkChannels(): Promise<DarkChannel[]> {
  const snapshot = await getCxSnapshot();
  const statusOrder: Record<ActivityStatus, number> = {
    atrasada: 0,
    em_andamento: 1,
    planejada: 2,
    concluida: 3,
    nao_feita: 4,
  };
  return snapshot.channels
    .filter((channel) => isDark(channel.lastExecutionAt))
    .map((channel) => {
      const days = daysSince(channel.lastExecutionAt);
      const lateCount = channel.activities.filter(
        (activity) => activity.status === "atrasada"
      ).length;
      const open = channel.activities
        .filter((activity) => OPEN_STATUSES.includes(activity.status))
        .sort((a, b) => {
          const dateA = a.dueDate ?? "9999-12-31";
          const dateB = b.dueDate ?? "9999-12-31";
          return (
            statusOrder[a.status] - statusOrder[b.status] ||
            (dateA < dateB ? -1 : dateA > dateB ? 1 : 0)
          );
        })
        .slice(0, 3)
        .map((activity) => ({
          id: activity.id,
          title: activity.title,
          status: activity.status,
        }));
      return {
        id: channel.id,
        name: channel.name,
        regionName: channel.regionName,
        dsmName: channel.dsm?.name ?? null,
        daysSinceExecution: days,
        lateCount,
        openActivities: open,
        summaryText: buildSummaryText({
          firstName: channel.dsm?.name.split(" ")[0] ?? null,
          channelName: channel.name,
          days,
          lateCount,
        }),
      } satisfies DarkChannel;
    })
    .sort(
      (a, b) =>
        (b.daysSinceExecution ?? Number.POSITIVE_INFINITY) -
        (a.daysSinceExecution ?? Number.POSITIVE_INFINITY)
    );
}

export type PersonRow = {
  id: string;
  name: string;
  role: Role;
  regionIds: string[];
  /** Canais (DSM) ou filiais (RTV/RDC) vinculados, para exibição. */
  linksLabel: string;
  activityCount: number;
  lateCount: number;
  lastExecutionAt: string | null;
  daysSinceExecution: number | null;
  summaryText: string;
};

/**
 * Visão de pessoas (tab "Pessoas" do /acompanhamento): DSM conta as
 * atividades dos canais que gerencia; RTV/RDC contam as atividades em
 * que são responsáveis diretos.
 */
export async function getPeopleRows(): Promise<PersonRow[]> {
  const snapshot = await getCxSnapshot();
  const channelById = new Map(
    snapshot.channels.map((channel) => [channel.id, channel])
  );
  const allActivities = snapshot.channels.flatMap((channel) =>
    channel.activities.map((activity) => ({ ...activity, channel }))
  );

  return snapshot.profiles
    .filter((profile) => profile.role !== "CX")
    .map((profile) => {
      const activities =
        profile.role === "DSM"
          ? allActivities.filter((activity) =>
              profile.channelIds.includes(activity.channel.id)
            )
          : allActivities.filter(
              (activity) => activity.responsibleId === profile.id
            );
      const lateCount = activities.filter(
        (activity) => activity.status === "atrasada"
      ).length;

      // Canal de referência da cobrança: o vinculado há mais tempo sem
      // registro de execução (o que mais precisa de um toque).
      const worstChannel = profile.channelIds
        .map((id) => channelById.get(id))
        .filter((channel): channel is SnapshotChannel => !!channel)
        .sort(
          (a, b) =>
            (daysSince(b.lastExecutionAt) ?? Number.POSITIVE_INFINITY) -
            (daysSince(a.lastExecutionAt) ?? Number.POSITIVE_INFINITY)
        )[0];

      const linksLabel =
        profile.role === "DSM"
          ? profile.channelNames.join(", ")
          : profile.branchNames.join(", ");

      return {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        regionIds: profile.regionIds,
        linksLabel: linksLabel || "—",
        activityCount: activities.length,
        lateCount,
        lastExecutionAt: profile.lastExecutionAt,
        daysSinceExecution: daysSince(profile.lastExecutionAt),
        summaryText: buildSummaryText({
          firstName: profile.name.split(" ")[0],
          channelName: worstChannel?.name ?? "seu canal",
          days: worstChannel ? daysSince(worstChannel.lastExecutionAt) : null,
          lateCount: worstChannel
            ? worstChannel.activities.filter(
                (activity) => activity.status === "atrasada"
              ).length
            : lateCount,
        }),
      } satisfies PersonRow;
    })
    .sort(
      (a, b) =>
        (b.daysSinceExecution ?? Number.POSITIVE_INFINITY) -
        (a.daysSinceExecution ?? Number.POSITIVE_INFINITY)
    );
}
