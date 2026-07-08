"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { StatusBadge } from "@/components/app/status-badge";
import type { ActivityStatus } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import type { ActivityRow } from "@/lib/db/channels";
import { cn } from "@/lib/utils";

// ── Status pill colors ─────────────────────────────────────────────────

const PILL_COLORS: Record<ActivityStatus, string> = {
  planejada:
    "bg-[#0063A7]/15 text-[#0063A7] dark:bg-[#0063A7]/25 dark:text-[#5AABEF]",
  em_andamento:
    "bg-[#0063A7]/15 text-[#0063A7] dark:bg-[#0063A7]/25 dark:text-[#5AABEF]",
  concluida:
    "bg-[#96CB40]/15 text-[#4A7A10] dark:bg-[#96CB40]/25 dark:text-[#B5DC73]",
  atrasada:
    "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-400",
  nao_feita:
    "bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-400",
};

const DOT_COLORS: Record<ActivityStatus, string> = {
  planejada: "bg-[#0063A7]",
  em_andamento: "bg-[#0063A7]",
  concluida: "bg-[#96CB40]",
  atrasada: "bg-amber-500",
  nao_feita: "bg-red-500",
};

// ── Weekday headers (Mon-Sun, Brazilian standard) ──────────────────────

const WEEKDAYS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// ── useMediaQuery ──────────────────────────────────────────────────────

function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    [query]
  );
  const getSnapshot = React.useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// ── Component ──────────────────────────────────────────────────────────

export function CalendarView({
  activities,
  channels,
}: {
  activities: ActivityRow[];
  channels: { id: string; name: string }[];
}) {
  const [currentMonth, setCurrentMonth] = React.useState(
    () => startOfMonth(new Date())
  );
  const [channelFilter, setChannelFilter] = React.useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const filtered = React.useMemo(() => {
    let result = activities.filter((a) => a.dueDate !== null);
    if (channelFilter) {
      result = result.filter((a) => a.channelId === channelFilter);
    }
    return result;
  }, [activities, channelFilter]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const activityMap = React.useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    for (const activity of filtered) {
      if (!activity.dueDate) continue;
      const key = activity.dueDate;
      const list = map.get(key) ?? [];
      list.push(activity);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const today = new Date();

  function goToPrevMonth() {
    setCurrentMonth((m) => subMonths(m, 1));
  }
  function goToNextMonth() {
    setCurrentMonth((m) => addMonths(m, 1));
  }
  function goToToday() {
    setCurrentMonth(startOfMonth(new Date()));
  }

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });
  const capitalizedMonth =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View toggle (week disabled for now) */}
        <div className="flex rounded-lg border p-0.5">
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Mês
          </button>
          <button
            type="button"
            disabled
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50"
          >
            Semana
          </button>
        </div>

        {/* Channel filter */}
        {channels.length > 1 && (
          <select
            value={channelFilter ?? ""}
            onChange={(e) => setChannelFilter(e.target.value || null)}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Todos os canais</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" onClick={goToPrevMonth}>
          <ChevronLeft className="size-4" />
          <span className="sr-only">Mês anterior</span>
        </Button>
        <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
          <ChevronRight className="size-4" />
          <span className="sr-only">Próximo mês</span>
        </Button>
        <h2 className="text-xl font-semibold">{capitalizedMonth}</h2>
        {!isSameMonth(today, currentMonth) && (
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        )}
      </div>

      {/* Calendar grid */}
      {isDesktop ? (
        <DesktopGrid
          days={days}
          currentMonth={currentMonth}
          activityMap={activityMap}

        />
      ) : (
        <MobileList
          days={days}
          currentMonth={currentMonth}
          activityMap={activityMap}

        />
      )}
    </div>
  );
}

// ── Desktop grid ───────────────────────────────────────────────────────

function DesktopGrid({
  days,
  currentMonth,
  activityMap,
}: {
  days: Date[];
  currentMonth: Date;
  activityMap: Map<string, ActivityRow[]>;
}) {
  const MAX_PILLS = 3;

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS_SHORT.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium uppercase text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayActivities = activityMap.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const todayCell = isToday(day);
          const overflow = dayActivities.length - MAX_PILLS;

          return (
            <div
              key={key}
              className={cn(
                "relative flex h-28 flex-col border-b border-r p-1.5",
                !inMonth && "opacity-40",
                isWeekend && "bg-muted/20",
                todayCell && "bg-primary/5"
              )}
            >
              {/* Day number */}
              <span
                className={cn(
                  "mb-1 flex size-7 shrink-0 items-center justify-center rounded-full text-sm",
                  todayCell &&
                    "bg-[#0063A7] font-semibold text-white"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Activity pills */}
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {dayActivities.slice(0, MAX_PILLS).map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/atividades/${activity.id}`;
                    }}
                    className={cn(
                      "flex h-5 w-full items-center rounded px-1.5 text-left text-xs font-medium transition-opacity hover:opacity-80",
                      PILL_COLORS[activity.status]
                    )}
                  >
                    <span className="truncate">{activity.title}</span>
                  </button>
                ))}
                {overflow > 0 && (
                  <span className="px-1.5 text-xs text-muted-foreground">
                    +{overflow} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mobile list ────────────────────────────────────────────────────────

function MobileList({
  days,
  currentMonth,
  activityMap,
}: {
  days: Date[];
  currentMonth: Date;
  activityMap: Map<string, ActivityRow[]>;
}) {
  const daysWithActivities = days.filter((day) => {
    if (!isSameMonth(day, currentMonth)) return false;
    const key = format(day, "yyyy-MM-dd");
    return (activityMap.get(key)?.length ?? 0) > 0;
  });

  if (daysWithActivities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade com prazo neste mês.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Compact month overview (dots) */}
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-7 bg-muted/30">
          {WEEKDAYS_SHORT.map((d) => (
            <div
              key={d}
              className="px-1 py-1.5 text-center text-[10px] font-medium uppercase text-muted-foreground"
            >
              {d.slice(0, 1)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayActivities = activityMap.get(key) ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const todayCell = isToday(day);

            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col items-center gap-0.5 border-b border-r py-1",
                  !inMonth && "opacity-30"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    todayCell && "bg-[#0063A7] font-semibold text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayActivities.length > 0 && (
                  <div className="flex gap-0.5">
                    {dayActivities.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className={cn(
                          "size-1.5 rounded-full",
                          DOT_COLORS[a.status]
                        )}
                      />
                    ))}
                    {dayActivities.length > 3 && (
                      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day list with activities */}
      <div className="flex flex-col gap-2">
        {daysWithActivities.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayActivities = activityMap.get(key) ?? [];
          const todayCell = isToday(day);
          const label = format(day, "EEE dd", { locale: ptBR });
          const capitalLabel =
            label.charAt(0).toUpperCase() + label.slice(1);

          return (
            <div key={key} className="flex flex-col gap-1.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  todayCell && "text-[#0063A7]"
                )}
              >
                {capitalLabel}
                {todayCell && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Hoje
                  </span>
                )}
              </p>
              <div className="flex flex-col gap-1">
                {dayActivities.map((activity) => (
                  <a
                    key={activity.id}
                    href={`/atividades/${activity.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      PILL_COLORS[activity.status]
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {activity.title}
                    </span>
                    <StatusBadge
                      status={activity.status}
                      className="shrink-0 text-[10px]"
                    />
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
