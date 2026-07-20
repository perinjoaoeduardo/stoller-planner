import { differenceInCalendarDays, parseISO } from "date-fns";

import type { ActivityStatus } from "@/components/shared/status-badge";
import type { ActivityCategory } from "@/lib/config";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import type { CurrentProfile } from "@/lib/auth/scope";
import { computeHealth, type ChannelHealth } from "@/lib/plan-utils";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados da HOME DO DSM (painel de gestão).
 * Uma consulta densa escopada aos canais do DSM (getScopedChannelIds):
 * saúde por canal, RTV responsável, canal compartilhado com outro DSM,
 * fila de exceções acionáveis e as atividades do próprio DSM.
 *
 * O status derivado (getDisplayStatus) e a regra dos 21 dias
 * (DARK_CHANNEL_DAYS) são aplicados aqui, nunca nos componentes.
 */

const OPEN_STATUSES = new Set<ActivityStatus>(["planejada", "atrasada"]);

/** Nº de atrasadas de um RTV a partir do qual vira exceção na fila. */
const RTV_LATE_THRESHOLD = 3;
/** Dias de atraso a partir dos quais uma atividade vira "atraso crítico". */
const CRITICAL_OVERDUE_DAYS = 30;

type Person = { id: string; name: string };

export type DsmHomeChannel = {
  id: string;
  name: string;
  region: string;
  branchCount: number;
  problemCount: number;
  activityCount: number;
  completedPercent: number;
  lateCount: number;
  health: ChannelHealth;
  /** RTVs vinculados às filiais do canal (responsáveis de campo). */
  rtvs: Person[];
  /** Outros DSMs que compartilham o canal (fora o DSM logado). */
  sharedWith: Person[];
  daysSinceExecution: number | null;
};

export type DsmMyActivity = {
  id: string;
  title: string;
  category: ActivityCategory | null;
  status: ActivityStatus;
  dueDate: string | null;
  branchName: string | null;
  channelName: string;
};

export type DsmExceptionKind =
  | "canal_escuro"
  | "rtv_atrasadas"
  | "meta_sem_atividade"
  | "atraso_critico";

export type DsmException = {
  key: string;
  kind: DsmExceptionKind;
  title: string;
  context: string | null;
  /** Destino quando a exceção leva a um canal/meta (Link comum). */
  href: string;
  /** Quando a exceção é uma atividade: abre o painel (modal), não a
   *  página cheia. Preenchido só no atraso_critico. */
  activityId?: string;
  /** Peso pra ordenar a fila (maior = mais urgente). */
  severity: number;
};

export type DsmHome = {
  channels: DsmHomeChannel[];
  stats: {
    channelCount: number;
    atRiskCount: number;
    rtvCount: number;
    myOpenCount: number;
    myHasOverdue: boolean;
  };
  exceptions: DsmException[];
  myActivities: DsmMyActivity[];
  byStatus: { status: ActivityStatus; total: number }[];
};

const ACTIVITY_STATUSES: ActivityStatus[] = [
  "planejada",
  "concluida",
  "atrasada",
  "nao_feita",
];

const EMPTY: DsmHome = {
  channels: [],
  stats: {
    channelCount: 0,
    atRiskCount: 0,
    rtvCount: 0,
    myOpenCount: 0,
    myHasOverdue: false,
  },
  exceptions: [],
  myActivities: [],
  byStatus: ACTIVITY_STATUSES.map((status) => ({ status, total: 0 })),
};

export async function getDsmHome(
  profile: CurrentProfile,
  channelIds: string[]
): Promise<DsmHome> {
  if (channelIds.length === 0) return EMPTY;

  const supabase = await createClient();

  const [channelsRes, linksRes, eventsRes] = await Promise.all([
    supabase
      .from("channels")
      .select(
        `id, name, region:regions(name),
         branches(id, name),
         plans(id, status,
           problems(id, title, activities(id)),
           activities(id, title, category, status, due_date, responsible_id,
             branch_id, branch:branches(name),
             activity_assignees(profile_id)))`
      )
      .in("id", channelIds)
      .eq("plans.status", "ativo")
      .order("name"),
    supabase
      .from("user_links")
      .select(
        `channel_id, branch_id,
         profile:profiles(id, full_name, role),
         branch:branches(channel_id)`
      ),
    supabase
      .from("activity_events")
      .select(`created_at, activity:activities(plan:plans(channel_id))`)
      .eq("type", "execucao_registrada")
      .order("created_at", { ascending: false }),
  ]);

  if (channelsRes.error) throw channelsRes.error;
  if (linksRes.error) throw linksRes.error;
  if (eventsRes.error) throw eventsRes.error;

  const channelSet = new Set(channelIds);

  // Último registro de execução por canal (eventos vêm desc; 1º vence).
  const lastByChannel = new Map<string, string>();
  for (const event of eventsRes.data) {
    const channelId = event.activity?.plan?.channel_id ?? null;
    if (channelId && channelSet.has(channelId) && !lastByChannel.has(channelId)) {
      lastByChannel.set(channelId, event.created_at);
    }
  }

  // RTVs por canal + DSMs por canal, a partir dos vínculos.
  const rtvByChannel = new Map<string, Map<string, Person>>();
  const dsmByChannel = new Map<string, Map<string, Person>>();
  for (const link of linksRes.data) {
    if (!link.profile) continue;
    const channelId = link.channel_id ?? link.branch?.channel_id ?? null;
    if (!channelId || !channelSet.has(channelId)) continue;
    const person: Person = { id: link.profile.id, name: link.profile.full_name };
    if (link.profile.role === "DSM") {
      const map = dsmByChannel.get(channelId) ?? new Map<string, Person>();
      map.set(person.id, person);
      dsmByChannel.set(channelId, map);
    } else if (link.profile.role === "RTV" || link.profile.role === "RDC") {
      const map = rtvByChannel.get(channelId) ?? new Map<string, Person>();
      map.set(person.id, person);
      rtvByChannel.set(channelId, map);
    }
  }

  const today = new Date();
  const daysSince = (iso: string | null): number | null =>
    iso === null ? null : differenceInCalendarDays(today, parseISO(iso));

  const channels: DsmHomeChannel[] = [];
  const myActivities: DsmMyActivity[] = [];
  const rtvNames = new Map<string, string>(); // id → nome (para exceções)
  const rtvLateCount = new Map<string, number>();
  const exceptions: DsmException[] = [];
  const statusTotals = new Map<ActivityStatus, number>();
  const rtvIdSet = new Set<string>();

  for (const channel of channelsRes.data) {
    const plan = channel.plans[0];
    const rtvs = [...(rtvByChannel.get(channel.id)?.values() ?? [])];
    const dsms = [...(dsmByChannel.get(channel.id)?.values() ?? [])];
    const sharedWith = dsms.filter((dsm) => dsm.id !== profile.id);
    for (const rtv of rtvs) {
      rtvIdSet.add(rtv.id);
      rtvNames.set(rtv.id, rtv.name);
    }

    const rawActivities = plan?.activities ?? [];
    const activities = rawActivities.map((activity) => {
      const status = getDisplayStatus({
        status: activity.status as ActivityStatus,
        dueDate: activity.due_date,
      });
      return { ...activity, displayStatus: status };
    });

    const total = activities.length;
    const completed = activities.filter((a) => a.displayStatus === "concluida")
      .length;
    const late = activities.filter((a) => a.displayStatus === "atrasada").length;
    const daysSinceExecution = daysSince(lastByChannel.get(channel.id) ?? null);

    channels.push({
      id: channel.id,
      name: channel.name,
      region: channel.region?.name ?? "—",
      branchCount: channel.branches.length,
      problemCount: plan?.problems.length ?? 0,
      activityCount: total,
      completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      lateCount: late,
      health: computeHealth(late, total),
      rtvs,
      sharedWith,
      daysSinceExecution,
    });

    // ── Deriva por atividade: status totals, minhas atividades, atraso
    //    por RTV, atraso crítico ──────────────────────────────────────
    for (const activity of activities) {
      statusTotals.set(
        activity.displayStatus,
        (statusTotals.get(activity.displayStatus) ?? 0) + 1
      );

      const assigneeIds = activity.activity_assignees
        .map((row) => row.profile_id)
        .filter((id): id is string => !!id);
      const owners = new Set(assigneeIds);
      if (activity.responsible_id) owners.add(activity.responsible_id);

      // Minhas atividades (DSM é responsável ou assignee)
      if (owners.has(profile.id) && OPEN_STATUSES.has(activity.displayStatus)) {
        myActivities.push({
          id: activity.id,
          title: activity.title,
          category: activity.category as ActivityCategory | null,
          status: activity.displayStatus,
          dueDate: activity.due_date,
          branchName: activity.branch?.name ?? null,
          channelName: channel.name,
        });
      }

      // Atrasadas por RTV (só quem é RTV/RDC do escopo)
      if (activity.displayStatus === "atrasada") {
        for (const ownerId of owners) {
          if (rtvIdSet.has(ownerId)) {
            rtvLateCount.set(ownerId, (rtvLateCount.get(ownerId) ?? 0) + 1);
          }
        }
        // Atraso crítico (passou muito do prazo)
        if (activity.due_date) {
          const overdue = differenceInCalendarDays(
            today,
            parseISO(activity.due_date)
          );
          if (overdue >= CRITICAL_OVERDUE_DAYS) {
            exceptions.push({
              key: `atraso:${activity.id}`,
              kind: "atraso_critico",
              title: activity.title,
              context: `venceu há ${overdue} dias · ${channel.name}`,
              href: `/atividades/${activity.id}`,
              activityId: activity.id,
              severity: 300 + overdue,
            });
          }
        }
      }
    }

    // ── Exceção: canal no escuro ──────────────────────────────────────
    if (daysSinceExecution === null) {
      exceptions.push({
        key: `escuro:${channel.id}`,
        kind: "canal_escuro",
        title: `${channel.name} sem nenhum registro`,
        context: "Nenhuma execução registrada na safra",
        href: `/canais/${channel.id}`,
        severity: 500,
      });
    } else if (daysSinceExecution > DARK_CHANNEL_DAYS) {
      exceptions.push({
        key: `escuro:${channel.id}`,
        kind: "canal_escuro",
        title: `${channel.name} sem registro há ${daysSinceExecution} dias`,
        context: "Sem execução registrada recentemente",
        href: `/canais/${channel.id}`,
        severity: 400 + daysSinceExecution,
      });
    }

    // ── Exceção: meta sem atividade vinculada ─────────────────────────
    for (const problem of plan?.problems ?? []) {
      if (problem.activities.length === 0) {
        exceptions.push({
          key: `meta:${problem.id}`,
          kind: "meta_sem_atividade",
          title: problem.title,
          context: `Meta sem atividades no plano · ${channel.name}`,
          href: `/canais/${channel.id}`,
          severity: 200,
        });
      }
    }
  }

  // ── Exceção: RTV com muitas atrasadas ───────────────────────────────
  for (const [rtvId, count] of rtvLateCount) {
    if (count >= RTV_LATE_THRESHOLD) {
      const name = rtvNames.get(rtvId) ?? "RTV";
      exceptions.push({
        key: `rtv:${rtvId}`,
        kind: "rtv_atrasadas",
        title: `${name} tem ${count} atividades atrasadas`,
        context: "Pode precisar de apoio na execução",
        // Origem do dado: filtro de atividades por responsável.
        href: `/atividades?responsavel=${rtvId}`,
        severity: 350 + count,
      });
    }
  }

  exceptions.sort((a, b) => b.severity - a.severity);

  // Minhas atividades: atrasadas primeiro, depois prazo mais próximo.
  myActivities.sort((a, b) => {
    const rank = (s: ActivityStatus) => (s === "atrasada" ? 0 : 1);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    if (a.dueDate === b.dueDate) return a.title.localeCompare(b.title);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });

  const atRiskCount = channels.filter((c) => c.health !== "em_dia").length;

  return {
    channels,
    stats: {
      channelCount: channels.length,
      atRiskCount,
      rtvCount: rtvIdSet.size,
      myOpenCount: myActivities.length,
      myHasOverdue: myActivities.some((a) => a.status === "atrasada"),
    },
    exceptions,
    myActivities,
    byStatus: ACTIVITY_STATUSES.map((status) => ({
      status,
      total: statusTotals.get(status) ?? 0,
    })),
  };
}
