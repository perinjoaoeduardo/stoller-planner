"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { NewActivityButton } from "@/components/app/new-activity-button";
import { StatusBadge } from "@/components/app/status-badge";
import type { ActivityStatus } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

// ── Types ─────────────────────────────────────────────────────────────

type ViewMode = "month" | "week";

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
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [channelFilter, setChannelFilter] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const filtered = React.useMemo(() => {
    let result = activities.filter((a) => a.dueDate !== null);
    if (channelFilter) {
      result = result.filter((a) => a.channelId === channelFilter);
    }
    return result;
  }, [activities, channelFilter]);

  // Month view days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Week view days
  const weekEnd = addDays(currentWeekStart, 6);
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: weekEnd,
  });

  const days = viewMode === "month" ? monthDays : weekDays;

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

  function goPrev() {
    if (viewMode === "month") {
      setCurrentMonth((m) => subMonths(m, 1));
    } else {
      setCurrentWeekStart((w) => subWeeks(w, 1));
    }
  }
  function goNext() {
    if (viewMode === "month") {
      setCurrentMonth((m) => addMonths(m, 1));
    } else {
      setCurrentWeekStart((w) => addWeeks(w, 1));
    }
  }
  function goToToday() {
    if (viewMode === "month") {
      setCurrentMonth(startOfMonth(new Date()));
    } else {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  }

  function switchView(mode: ViewMode) {
    if (mode === "week") {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
    setViewMode(mode);
  }

  const headerLabel =
    viewMode === "month"
      ? (() => {
          const label = format(currentMonth, "MMMM yyyy", { locale: ptBR });
          return label.charAt(0).toUpperCase() + label.slice(1);
        })()
      : (() => {
          const start = format(currentWeekStart, "dd MMM", { locale: ptBR });
          const end = format(weekEnd, "dd MMM yyyy", { locale: ptBR });
          return `${start} — ${end}`;
        })();

  const showTodayButton =
    viewMode === "month"
      ? !isSameMonth(today, currentMonth)
      : !isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }));

  return (
    <div className="flex flex-col gap-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View toggle */}
        <div className="flex rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => switchView("month")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "month"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mês
          </button>
          <button
            type="button"
            onClick={() => switchView("week")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
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

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" onClick={goPrev}>
          <ChevronLeft className="size-4" />
          <span className="sr-only">Anterior</span>
        </Button>
        <Button variant="outline" size="icon-sm" onClick={goNext}>
          <ChevronRight className="size-4" />
          <span className="sr-only">Próximo</span>
        </Button>
        <h2 className="text-xl font-semibold">{headerLabel}</h2>
        {showTodayButton && (
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        )}
      </div>

      {/* Calendar grid */}
      {viewMode === "month" ? (
        isDesktop ? (
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
        )
      ) : isDesktop ? (
        <WeekGrid days={weekDays} activityMap={activityMap} />
      ) : (
        <MobileWeekList days={weekDays} activityMap={activityMap} />
      )}
    </div>
  );
}

// ── Day popover content (shared) ──────────────────────────────────────

function DayActivitiesList({
  day,
  activities,
}: {
  day: Date;
  activities: ActivityRow[];
}) {
  const dateStr = format(day, "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-3">
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade neste dia.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {activities.map((activity) => (
            <a
              key={activity.id}
              href={`/atividades/${activity.id}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:opacity-80",
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
      )}
      <NewActivityButton
        mode="agendar"
        date={dateStr}
        label="Agendar nesta data"
        variant="outline"
        size="sm"
        className="w-full"
        icon={<Plus className="mr-1.5 size-3.5" />}
      />
    </div>
  );
}

// ── Desktop grid (month) ──────────────────────────────────────────────

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
            <Popover key={key}>
              <PopoverTrigger
                nativeButton={false}
                render={
                  <div
                    className={cn(
                      "relative flex h-28 cursor-pointer flex-col border-b border-r p-1.5 transition-colors hover:bg-accent/50",
                      !inMonth && "opacity-40",
                      isWeekend && "bg-muted/20",
                      todayCell && "bg-primary/5"
                    )}
                  />
                }
              >
                {/* Day number */}
                <span
                  className={cn(
                    "mb-1 flex size-7 shrink-0 items-center justify-center rounded-full text-sm",
                    todayCell && "bg-[#0063A7] font-semibold text-white"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Activity pills */}
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                  {dayActivities.slice(0, MAX_PILLS).map((activity) => (
                    <a
                      key={activity.id}
                      href={`/atividades/${activity.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "flex h-5 w-full items-center rounded px-1.5 text-left text-xs font-medium transition-opacity hover:opacity-80",
                        PILL_COLORS[activity.status]
                      )}
                    >
                      <span className="truncate">{activity.title}</span>
                    </a>
                  ))}
                  {overflow > 0 && (
                    <span className="px-1.5 text-xs text-muted-foreground">
                      +{overflow} mais
                    </span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <PopoverHeader>
                  <PopoverTitle>
                    {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </PopoverTitle>
                </PopoverHeader>
                <DayActivitiesList day={day} activities={dayActivities} />
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}

// ── Week grid (desktop) ───────────────────────────────────────────────

function WeekGrid({
  days,
  activityMap,
}: {
  days: Date[];
  activityMap: Map<string, ActivityRow[]>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayActivities = activityMap.get(key) ?? [];
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const todayCell = isToday(day);
          const dayLabel = format(day, "EEE", { locale: ptBR });
          const capitalDay =
            dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-[28rem] flex-col border-r last:border-r-0",
                isWeekend && "bg-muted/20",
                todayCell && "bg-primary/5"
              )}
            >
              {/* Day header */}
              <div className="flex flex-col items-center gap-0.5 border-b bg-muted/30 py-2">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {capitalDay}
                </span>
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-medium",
                    todayCell && "bg-[#0063A7] text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Activities column */}
              <div className="flex flex-1 flex-col gap-1 p-1.5">
                {dayActivities.map((activity) => (
                  <a
                    key={activity.id}
                    href={`/atividades/${activity.id}`}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-xs transition-opacity hover:opacity-80",
                      PILL_COLORS[activity.status]
                    )}
                  >
                    <span className="font-medium leading-tight">
                      {activity.title}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {activity.channelName}
                    </span>
                  </a>
                ))}
                {dayActivities.length === 0 && (
                  <div className="flex flex-1 items-center justify-center">
                    <NewActivityButton
                      mode="agendar"
                      date={key}
                      label=""
                      variant="ghost"
                      size="icon-sm"
                      icon={
                        <Plus className="size-4 text-muted-foreground/50" />
                      }
                    />
                  </div>
                )}
              </div>

              {/* Add button at bottom */}
              <div className="border-t p-1.5">
                <NewActivityButton
                  mode="agendar"
                  date={key}
                  label="Agendar"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  icon={<Plus className="mr-1 size-3" />}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mobile list (month) ───────────────────────────────────────────────

function MobileList({
  days,
  currentMonth,
  activityMap,
}: {
  days: Date[];
  currentMonth: Date;
  activityMap: Map<string, ActivityRow[]>;
}) {
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedActivities = selectedKey
    ? activityMap.get(selectedKey) ?? []
    : [];

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
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex flex-col items-center gap-0.5 border-b border-r py-1 transition-colors",
                  !inMonth && "opacity-30",
                  selectedDay && isSameDay(day, selectedDay) && "bg-accent"
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Sheet for selected day */}
      <Sheet
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>
              {selectedDay
                ? format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })
                : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            {selectedDay && (
              <DayActivitiesList
                day={selectedDay}
                activities={selectedActivities}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Day list with activities (still show below for scrolling) */}
      {(() => {
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
        );
      })()}
    </div>
  );
}

// ── Mobile week list ──────────────────────────────────────────────────

function MobileWeekList({
  days,
  activityMap,
}: {
  days: Date[];
  activityMap: Map<string, ActivityRow[]>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayActivities = activityMap.get(key) ?? [];
        const todayCell = isToday(day);
        const label = format(day, "EEEE dd", { locale: ptBR });
        const capitalLabel = label.charAt(0).toUpperCase() + label.slice(1);

        return (
          <div
            key={key}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-3",
              todayCell && "border-[#0063A7]/30 bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between">
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
              <NewActivityButton
                mode="agendar"
                date={key}
                label=""
                variant="ghost"
                size="icon-sm"
                icon={<Plus className="size-4 text-muted-foreground" />}
              />
            </div>
            {dayActivities.length > 0 ? (
              <div className="flex flex-col gap-1">
                {dayActivities.map((activity) => (
                  <a
                    key={activity.id}
                    href={`/atividades/${activity.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:opacity-80",
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
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma atividade.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
