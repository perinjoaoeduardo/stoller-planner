"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CircleAlert,
  CircleCheckBig,
  ClipboardPlus,
  ListTodo,
  RefreshCw,
  Search,
  SearchX,
} from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";

import { ActivityCard } from "@/components/app/activity-card";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import type { ActivityRow } from "@/lib/db/channels";
import { cn } from "@/lib/utils";

type StatusChip = "abertas" | "concluidas" | "atrasadas" | "todas";

const CHIPS: { value: StatusChip; label: string }[] = [
  { value: "abertas", label: "Abertas" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "concluidas", label: "Concluídas" },
  { value: "todas", label: "Todas" },
];

const OPEN = new Set(["planejada", "em_andamento", "atrasada"]);

/**
 * Ordenação: atrasadas primeiro (por dias de atraso desc), depois
 * abertas por prazo mais próximo, concluídas por último (recentes
 * primeiro).
 */
function sortActivities(activities: ActivityRow[]): ActivityRow[] {
  const rank = (activity: ActivityRow) => {
    if (activity.status === "atrasada") return 0;
    if (OPEN.has(activity.status)) return 1;
    return 2;
  };
  return [...activities].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    if (rank(a) === 2) {
      const dateA = a.completedAt ?? a.createdAt;
      const dateB = b.completedAt ?? b.createdAt;
      return dateA < dateB ? 1 : -1;
    }
    const dueA = a.dueDate ?? "9999-12-31";
    const dueB = b.dueDate ?? "9999-12-31";
    return dueA < dueB ? -1 : dueA > dueB ? 1 : 0;
  });
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof CircleAlert;
  tone?: "default" | "alert";
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardDescription>{label}</CardDescription>
        <Icon
          className={cn(
            "size-4 shrink-0 text-muted-foreground",
            tone === "alert" && "text-amber-600 dark:text-amber-400"
          )}
        />
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            tone === "alert" && "text-amber-600 dark:text-amber-400"
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Visão pessoal do RTV — 4 métricas cross-canal, filtros ricos e cards
 * em coluna única com agrupamento por canal quando o filtro está em
 * "Todos" e o RTV atua em mais de 1 canal.
 */
export function MyActivitiesList({
  activities,
  initialStatus = "abertas",
}: {
  activities: ActivityRow[];
  initialStatus?: StatusChip;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = React.useTransition();
  const [chip, setChip] = React.useState<StatusChip>(initialStatus);
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    null
  );
  const [problemFilter, setProblemFilter] = React.useState<string | null>(null);

  const channels = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const activity of activities) {
      if (activity.channelId && !seen.has(activity.channelId)) {
        seen.set(activity.channelId, activity.channelName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activities]);
  const showChannelFilter = channels.length > 1;

  const channelOptions: SelectOption[] = React.useMemo(
    () =>
      channels.map((channel) => ({ value: channel.id, label: channel.name })),
    [channels]
  );

  const categoryOptions = React.useMemo(() => {
    const seen = new Set<ActivityCategory>();
    for (const activity of activities) {
      if (activity.category) seen.add(activity.category);
    }
    return [...seen].map((category) => ({
      value: category,
      label: CATEGORY_LABELS[category],
    }));
  }, [activities]);

  const problemOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const activity of activities) {
      if (activity.problemId && activity.problemTitle) {
        seen.set(activity.problemId, activity.problemTitle);
      }
    }
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activities]);

  const channelApplied = channelId !== null;

  const filtered = React.useMemo(() => {
    let result = activities;
    if (chip === "abertas") {
      result = result.filter((activity) => OPEN.has(activity.status));
    } else if (chip === "atrasadas") {
      result = result.filter((activity) => activity.status === "atrasada");
    } else if (chip === "concluidas") {
      result = result.filter((activity) => activity.status === "concluida");
    }
    if (channelApplied) {
      result = result.filter((activity) => activity.channelId === channelId);
    }
    if (categoryFilter) {
      result = result.filter((activity) => activity.category === categoryFilter);
    }
    if (problemFilter) {
      result = result.filter((activity) => activity.problemId === problemFilter);
    }
    if (search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      result = result.filter((activity) =>
        activity.title.toLowerCase().includes(term)
      );
    }
    return result;
  }, [
    activities,
    chip,
    channelId,
    channelApplied,
    categoryFilter,
    problemFilter,
    search,
  ]);

  // Métricas pessoais — sempre baseadas em TODAS as atividades do RTV
  // (não afetadas pelos filtros da lista abaixo).
  const metrics = React.useMemo(() => {
    const open = activities.filter((activity) =>
      OPEN.has(activity.status)
    ).length;
    const completed = activities.filter(
      (activity) => activity.status === "concluida"
    ).length;
    const late = activities.filter(
      (activity) => activity.status === "atrasada"
    ).length;
    const today = new Date();
    const dueSoon = activities.filter(
      (activity) =>
        OPEN.has(activity.status) &&
        activity.status !== "atrasada" &&
        activity.dueDate !== null &&
        differenceInCalendarDays(parseISO(activity.dueDate), today) <= 7 &&
        differenceInCalendarDays(parseISO(activity.dueDate), today) >= 0
    ).length;
    const total = activities.length;
    return {
      open,
      completed,
      completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      late,
      dueSoon,
      total,
    };
  }, [activities]);

  const groups = React.useMemo(() => {
    const byChannel = new Map<string, { name: string; items: ActivityRow[] }>();
    for (const activity of filtered) {
      const group = byChannel.get(activity.channelId) ?? {
        name: activity.channelName,
        items: [],
      };
      group.items.push(activity);
      byChannel.set(activity.channelId, group);
    }
    return [...byChannel.entries()]
      .map(([id, group]) => ({
        id,
        name: group.name,
        items: sortActivities(group.items),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // Agrupa quando canal filter está em "todos" e há mais de 1 canal.
  const grouped = !channelApplied && groups.length > 1;
  const flatList = React.useMemo(() => sortActivities(filtered), [filtered]);

  const filtersActive =
    chip !== "abertas" ||
    channelApplied ||
    categoryFilter !== null ||
    problemFilter !== null ||
    search.trim().length > 0;

  function clearFilters() {
    setChip("abertas");
    setChannelId(null);
    setCategoryFilter(null);
    setProblemFilter(null);
    setSearch("");
  }

  // Sem atividades atribuídas: empty central com CTA de avulso.
  if (activities.length === 0) {
    return (
      <Empty className="flex-1 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListTodo />
          </EmptyMedia>
          <EmptyTitle>Nenhuma atividade atribuída a você</EmptyTitle>
          <EmptyDescription>
            Você pode registrar uma ação avulsa a qualquer momento.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            nativeButton={false}
            render={
              <Link href="/registrar?avulso=1">
                <ClipboardPlus />
                Registrar ação fora do plano
              </Link>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Bloco 1 — 4 métricas pessoais */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Abertas"
          value={metrics.open}
          hint="abertas na safra"
          icon={ListTodo}
        />
        <MetricCard
          label="Concluídas"
          value={metrics.completed}
          hint={`${metrics.completedPercent}% do total`}
          icon={CircleCheckBig}
        />
        <MetricCard
          label="Atrasadas"
          value={metrics.late}
          hint={metrics.late === 1 ? "precisa de atenção" : "precisam de atenção"}
          icon={CircleAlert}
          tone={metrics.late > 0 ? "alert" : "default"}
        />
        <MetricCard
          label="Vencem em 7 dias"
          value={metrics.dueSoon}
          hint="prazo próximo"
          icon={CalendarClock}
          tone={metrics.dueSoon > 0 ? "alert" : "default"}
        />
      </div>

      {/* Bloco 2 — filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título..."
              className="h-10 pl-9"
            />
          </div>
          <div className="flex gap-2">
            {CHIPS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setChip(item.value)}
                className={cn(
                  "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                  chip === item.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {showChannelFilter ? (
            <SearchableSelect
              options={channelOptions}
              value={channelId}
              onValueChange={setChannelId}
              placeholder="Canal"
              className="h-10 min-w-40"
            />
          ) : null}
          {categoryOptions.length > 0 ? (
            <SearchableSelect
              options={categoryOptions}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Categoria"
              className="h-10 min-w-40"
            />
          ) : null}
          {problemOptions.length > 0 ? (
            <SearchableSelect
              options={problemOptions}
              value={problemFilter}
              onValueChange={setProblemFilter}
              placeholder="Meta"
              className="h-10 min-w-44"
            />
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-10 shrink-0 text-muted-foreground"
            aria-label="Atualizar lista"
            disabled={refreshing}
            onClick={() => startRefresh(() => router.refresh())}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {filtered.length} de {activities.length} atividades
        </p>
      </div>

      {/* Bloco 3 — lista de atividades */}
      {filtered.length === 0 ? (
        <Empty className="rounded-3xl border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Nenhum resultado com esses filtros.</EmptyTitle>
          </EmptyHeader>
          {filtersActive ? (
            <EmptyContent>
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : grouped ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.id} className="flex flex-col gap-2">
              <h2 className="flex items-baseline gap-1.5 text-sm font-semibold">
                {group.name}
                <span className="font-normal text-muted-foreground tabular-nums">
                  ({group.items.length})
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {group.items.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    showCanal={false}
                    activity={activity}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {flatList.map((activity) => (
            <ActivityCard
              key={activity.id}
              showCanal={!channelApplied}
              activity={activity}
            />
          ))}
        </div>
      )}
    </div>
  );
}

