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

import { useActivityDrawer } from "@/components/app/activity-drawer";
import { CategoryIconBox } from "@/components/shared/icon-box";
import { categoryIcon } from "@/lib/category-icons";
import { NewActivityButton } from "@/components/app/new-activity-button";
import { SearchableSelect } from "@/components/app/searchable-select";
import { StatusBadge, STATUS_LABELS } from "@/components/shared/status-badge";
import type { ActivityStatus } from "@/components/shared/status-badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActivityRow } from "@/lib/db/channels";
import { formatRelativeDue } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";

// ── Pills: sistema de status do app (FIX 2) — sem azul ────────────────

const PILL_COLORS: Record<ActivityStatus, string> = {
  planejada: "bg-muted text-foreground",
  concluida:
    "bg-success-bg text-success-fg",
  atrasada:
    "bg-warning-bg text-warning-fg",
  nao_feita: "bg-muted text-muted-foreground",
};

const DOT_COLORS: Record<ActivityStatus, string> = {
  planejada: "bg-accent-brand/50",
  concluida: "bg-success",
  atrasada: "bg-warning",
  nao_feita: "bg-muted-foreground/40",
};

/** "Planejada, vence em 6 dias" — corpo do tooltip da pill. */
function statusSentence(activity: ActivityRow): string {
  const status = STATUS_LABELS[activity.status];
  return activity.dueDate
    ? `${status}, ${formatRelativeDue(activity.dueDate)}`
    : status;
}

/** Pill de evento: ícone da categoria + título truncado + tooltip. */
function EventPill({
  activity,
  onClick,
  highlighted,
  className,
}: {
  activity: ActivityRow;
  onClick: (e: React.MouseEvent) => void;
  highlighted?: boolean;
  className?: string;
}) {
  const Icon = categoryIcon(activity.category);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "flex w-full cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-80",
              PILL_COLORS[activity.status],
              highlighted && "animate-pulse",
              className
            )}
          />
        }
      >
        <Icon className="size-3 shrink-0" />
        <span
          className={cn(
            "truncate",
            activity.status === "nao_feita" && "line-through"
          )}
        >
          {activity.title}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {activity.title}. {statusSentence(activity)}
      </TooltipContent>
    </Tooltip>
  );
}

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

  // Highlight sutil na pill recém-criada pelo wizard (FIX 6).
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onCreated(e: Event) {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      setHighlightId(id);
      clearTimeout(timer);
      timer = setTimeout(() => setHighlightId(null), 2500);
    }
    window.addEventListener("stoller:activity-created", onCreated);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("stoller:activity-created", onCreated);
    };
  }, []);

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
      {/* Barra única: toggle à esquerda, navegação ao centro, filtro à
          direita (FIX Semana — sem segunda linha solta). */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View toggle — segmented neutro: pill selecionada em bg-card
            + text-foreground + shadow-sm (sem cor). */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => switchView("month")}
            aria-pressed={viewMode === "month"}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "month"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mês
          </button>
          <button
            type="button"
            onClick={() => switchView("week")}
            aria-pressed={viewMode === "week"}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "week"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Semana
          </button>
        </div>

        {/* Navegação encostada à esquerda; o filtro de canais é o que
            ganha o `ml-auto` e vai para a direita. */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={goPrev}>
            <ChevronLeft className="size-4" />
            <span className="sr-only">Anterior</span>
          </Button>
          <h2 className="whitespace-nowrap text-base font-semibold">
            {headerLabel}
          </h2>
          <Button variant="outline" size="icon-sm" onClick={goNext}>
            <ChevronRight className="size-4" />
            <span className="sr-only">Próximo</span>
          </Button>
          {showTodayButton && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          )}
        </div>

        {/* Channel filter — encostado à direita da linha. */}
        {channels.length > 1 && (
          <SearchableSelect
            options={channels.map((ch) => ({ value: ch.id, label: ch.name }))}
            value={channelFilter}
            onValueChange={setChannelFilter}
            placeholder="Todos os canais"
            className="ml-auto h-9 min-w-48 border-input bg-card"
          />
        )}
      </div>

      {/* Calendar grid */}
      {viewMode === "month" ? (
        isDesktop ? (
          <DesktopGrid
            days={days}
            currentMonth={currentMonth}
            activityMap={activityMap}
            channelFilter={channelFilter}
            highlightId={highlightId}
          />
        ) : (
          <MobileList
            days={days}
            currentMonth={currentMonth}
            activityMap={activityMap}
            channelFilter={channelFilter}
          />
        )
      ) : isDesktop ? (
        <WeekGrid
          days={weekDays}
          activityMap={activityMap}
          channelFilter={channelFilter}
          highlightId={highlightId}
        />
      ) : (
        <WeekAgenda
          days={weekDays}
          activityMap={activityMap}
          channelFilter={channelFilter}
          highlightId={highlightId}
        />
      )}
    </div>
  );
}

// ── Day popover content (shared) ──────────────────────────────────────

function DayActivitiesList({
  day,
  activities,
  channelFilter,
}: {
  day: Date;
  activities: ActivityRow[];
  channelFilter: string | null;
}) {
  const dateStr = format(day, "yyyy-MM-dd");
  const { openActivity } = useActivityDrawer();

  return (
    <div className="flex flex-col gap-3">
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade neste dia.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => openActivity(activity.id)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <CategoryIconBox category={activity.category} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {activity.title}
              </span>
              <StatusBadge
                status={activity.status}
                className="shrink-0 text-[10px]"
              />
            </button>
          ))}
        </div>
      )}
      <NewActivityButton
        mode="agendar"
        date={dateStr}
        channelId={channelFilter ?? undefined}
        label="Agendar nesta data"
        variant="outline"
        size="sm"
        className="w-full hover:bg-muted"
        icon={<Plus className="mr-1.5 size-3.5" />}
      />
    </div>
  );
}

// ── Desktop grid (month) — FIX 3 ──────────────────────────────────────

function DesktopGrid({
  days,
  currentMonth,
  activityMap,
  channelFilter,
  highlightId,
}: {
  days: Date[];
  currentMonth: Date;
  activityMap: Map<string, ActivityRow[]>;
  channelFilter: string | null;
  highlightId: string | null;
}) {
  const MAX_PILLS = 3;
  const { openActivity } = useActivityDrawer();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS_SHORT.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
          const todayCell = isToday(day);
          const overflow = dayActivities.length - MAX_PILLS;

          return (
            <Popover key={key}>
              <PopoverTrigger
                nativeButton={false}
                render={
                  <div
                    className={cn(
                      "relative flex min-h-[110px] cursor-pointer flex-col gap-1 border-b border-r border-hover-surface p-2 transition-colors hover:bg-subtle",
                      !inMonth && "bg-subtle",
                      todayCell && "bg-primary/5"
                    )}
                  />
                }
              >
                {/* Day number */}
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-sm",
                    todayCell
                      ? "bg-primary font-semibold text-primary-foreground shadow-sm ring-2 ring-primary/15"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Activity pills */}
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                  {dayActivities.slice(0, MAX_PILLS).map((activity) => (
                    <EventPill
                      key={activity.id}
                      activity={activity}
                      highlighted={highlightId === activity.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openActivity(activity.id);
                      }}
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="px-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                      +{overflow} mais
                    </span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="max-w-xs rounded-xl border-border p-4 shadow-lg">
                <PopoverHeader className="p-0 pb-3">
                  <PopoverTitle className="text-sm font-semibold text-foreground">
                    {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </PopoverTitle>
                </PopoverHeader>
                <DayActivitiesList
                  day={day}
                  activities={dayActivities}
                  channelFilter={channelFilter}
                />
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}

// ── Visão semanal desktop: 7 colunas lado a lado ──────────────────────

/** Borda esquerda do mini-card por status (alarme único: âmbar atraso,
 *  verde conclusão, resto neutro). */
const EDGE_COLORS: Record<ActivityStatus, string> = {
  planejada: "border-l-muted-foreground/30",
  concluida: "border-l-success",
  atrasada: "border-l-warning",
  nao_feita: "border-l-muted-foreground/20",
};

const MAX_WEEK_CARDS = 3;

/** Mini-card de atividade dentro da coluna do dia. */
function WeekMiniCard({
  activity,
  highlighted,
  onClick,
}: {
  activity: ActivityRow;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full cursor-pointer rounded-md border-l-2 bg-subtle px-2 py-1.5 text-left transition-colors hover:bg-hover-surface",
        EDGE_COLORS[activity.status],
        highlighted && "animate-pulse"
      )}
    >
      <span className="flex items-center gap-1.5">
        <CategoryIconBox
          category={activity.category}
          size="sm"
          className="size-5 rounded-md"
          iconClassName="size-3"
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs font-medium text-foreground",
            activity.status === "nao_feita" &&
              "text-muted-foreground line-through"
          )}
        >
          {activity.title}
        </span>
      </span>
      <span className="mt-1 flex items-center gap-1.5 pl-0.5">
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            DOT_COLORS[activity.status]
          )}
        />
        <span className="truncate text-[10px] text-muted-foreground">
          {activity.channelName}
        </span>
      </span>
    </button>
  );
}

function WeekGrid({
  days,
  activityMap,
  channelFilter,
  highlightId,
}: {
  days: Date[];
  activityMap: Map<string, ActivityRow[]>;
  channelFilter: string | null;
  highlightId: string | null;
}) {
  const { openActivity } = useActivityDrawer();

  return (
    <div className="grid min-h-[520px] grid-cols-7 gap-3">
      {days.map((day, index) => {
        const key = format(day, "yyyy-MM-dd");
        const dayActivities = activityMap.get(key) ?? [];
        const todayCell = isToday(day);
        const overflow = dayActivities.length - MAX_WEEK_CARDS;
        // Semana sempre começa na segunda (weekStartsOn: 1) — o índice
        // bate com o array canônico de abreviações.
        const weekdayShort = WEEKDAYS_SHORT[index].toUpperCase();

        const popoverContent = (
          <PopoverContent className="max-w-xs rounded-xl border-border p-4 shadow-lg">
            <PopoverHeader className="p-0 pb-3">
              <PopoverTitle className="text-sm font-semibold text-foreground">
                {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </PopoverTitle>
            </PopoverHeader>
            <DayActivitiesList
              day={day}
              activities={dayActivities}
              channelFilter={channelFilter}
            />
          </PopoverContent>
        );

        return (
          <div
            key={key}
            className={cn(
              "group flex flex-col overflow-hidden rounded-xl border border-border bg-card",
              todayCell && "bg-subtle"
            )}
          >
            {/* Header do dia — clicável (popover) + "+" no hover */}
            <div className="flex items-start justify-between border-b border-border px-3 py-2.5">
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="cursor-pointer text-left"
                      aria-label={format(day, "EEEE, dd 'de' MMMM", {
                        locale: ptBR,
                      })}
                    />
                  }
                >
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {weekdayShort}
                  </span>
                  <span
                    className={cn(
                      "block text-lg font-semibold leading-tight",
                      todayCell ? "text-accent-brand" : "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </PopoverTrigger>
                {popoverContent}
              </Popover>
              <NewActivityButton
                mode="agendar"
                date={key}
                channelId={channelFilter ?? undefined}
                label=""
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                icon={<Plus className="size-3.5" />}
              />
            </div>

            {/* Corpo — mini-cards ou vazio */}
            <div className="flex flex-1 flex-col gap-1.5 p-2">
              {dayActivities.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs italic text-muted-foreground/70">
                    Sem atividades
                  </p>
                </div>
              ) : (
                <>
                  {dayActivities.slice(0, MAX_WEEK_CARDS).map((activity) => (
                    <WeekMiniCard
                      key={activity.id}
                      activity={activity}
                      highlighted={highlightId === activity.id}
                      onClick={() => openActivity(activity.id)}
                    />
                  ))}
                  {overflow > 0 && (
                    <Popover>
                      <PopoverTrigger
                        render={
                          <button
                            type="button"
                            className="mt-auto cursor-pointer rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-hover-surface hover:text-foreground"
                          />
                        }
                      >
                        +{overflow} mais
                      </PopoverTrigger>
                      {popoverContent}
                    </Popover>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Visão semanal mobile: agenda vertical ─────────────────────────────

function WeekAgenda({
  days,
  activityMap,
  channelFilter,
  highlightId,
}: {
  days: Date[];
  activityMap: Map<string, ActivityRow[]>;
  channelFilter: string | null;
  highlightId: string | null;
}) {
  const { openActivity } = useActivityDrawer();

  return (
    <div className="flex flex-col gap-2">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayActivities = activityMap.get(key) ?? [];
        const todayCell = isToday(day);
        const weekday = format(day, "EEEE", { locale: ptBR });
        const capitalDay = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        const dayLabel = `${capitalDay}, ${format(day, "d")} ${format(day, "MMM", { locale: ptBR })}`;
        const hasActivities = dayActivities.length > 0;

        const todayChip = todayCell ? (
          <span className="shrink-0 rounded-full bg-accent-brand/10 px-2 py-0.5 text-xs font-medium text-accent-brand">
            Hoje
          </span>
        ) : null;

        const agendarBtn = (
          <NewActivityButton
            mode="agendar"
            date={key}
            channelId={channelFilter ?? undefined}
            label=""
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-muted-foreground hover:text-foreground"
            icon={<Plus className="size-4" />}
          />
        );

        // Dia vazio = linha compacta, sem card wrapper.
        if (!hasActivities) {
          return (
            <div key={key} className="flex items-center gap-2 px-1 py-2.5">
              <p className="text-sm font-medium text-muted-foreground">
                {dayLabel}
              </p>
              {todayChip}
              {agendarBtn}
            </div>
          );
        }

        // Dia com atividades = card (sem borda de destaque; o chip
        // "Hoje" já ancora o dia atual).
        return (
          <div
            key={key}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {dayLabel}
              </p>
              {todayChip}
              {agendarBtn}
            </div>
            <div className="mt-3 flex flex-col gap-1">
              {dayActivities.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => openActivity(activity.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-hover-surface",
                    highlightId === activity.id && "animate-pulse"
                  )}
                >
                  <CategoryIconBox category={activity.category} size="md" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {activity.title}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {activity.channelName}
                  </span>
                  <StatusBadge
                    status={activity.status}
                    className="shrink-0 text-[10px]"
                  />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile list (month) ───────────────────────────────────────────────

function MobileList({
  days,
  currentMonth,
  activityMap,
  channelFilter,
}: {
  days: Date[];
  currentMonth: Date;
  activityMap: Map<string, ActivityRow[]>;
  channelFilter: string | null;
}) {
  const { openActivity } = useActivityDrawer();
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedActivities = selectedKey
    ? activityMap.get(selectedKey) ?? []
    : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Compact month overview (dots) */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS_SHORT.map((d) => (
            <div
              key={d}
              className="px-1 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
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
                  "flex flex-col items-center gap-0.5 border-b border-r border-hover-surface py-1 transition-colors",
                  !inMonth && "bg-subtle opacity-50",
                  selectedDay &&
                    isSameDay(day, selectedDay) &&
                    "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    todayCell && "bg-primary font-semibold text-primary-foreground"
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
                channelFilter={channelFilter}
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
                  <p className="text-sm font-medium text-foreground">
                    {capitalLabel}
                    {todayCell && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Hoje
                      </span>
                    )}
                  </p>
                  <div className="flex flex-col gap-1">
                    {dayActivities.map((activity) => (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() => openActivity(activity.id)}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <CategoryIconBox category={activity.category} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {activity.title}
                        </span>
                        <StatusBadge
                          status={activity.status}
                          className="shrink-0 text-[10px]"
                        />
                      </button>
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
