"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  Camera,
  CircleAlert,
  CircleCheckBig,
  ClipboardList,
} from "lucide-react";

import { ActivitiesByProblemChart } from "@/components/app/activities-by-problem-chart";
import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { ActivityCard } from "@/components/app/activity-card";
import { ProblemsTab } from "@/components/app/problems-tab";
import { SearchableSelect } from "@/components/app/searchable-select";
import { ACTIVITY_STATUSES } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  ActivityRow,
  ChannelDetail,
  ProblemRow,
} from "@/lib/db/channels";
import { isLateActivity, todayISO } from "@/lib/db/status";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import { cn } from "@/lib/utils";

const PENDING = new Set(["planejada", "em_andamento", "atrasada"]);

function addDaysISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Visão do canal do RTV — três abas (Visão geral / Problemas / Atividades)
 * dentro do container largura cheia. Sem botões de gestão (criar, editar,
 * excluir); apenas registro e visualização.
 */
export function MeuCanalView({
  channel,
  problems,
  activities,
  profileId,
}: {
  channel: ChannelDetail;
  problems: ProblemRow[];
  activities: ActivityRow[];
  profileId: string;
}) {
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);
  const [activityStatus, setActivityStatus] = React.useState<
    "abertas" | "concluidas" | "todas"
  >("abertas");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    null
  );
  const [problemFilter, setProblemFilter] = React.useState<string | null>(null);
  const [onlyMine, setOnlyMine] = React.useState(false);

  const filteredByBranch = React.useMemo(
    () =>
      branchFilter
        ? activities.filter((activity) => activity.branchId === branchFilter)
        : activities,
    [activities, branchFilter]
  );

  const metrics = React.useMemo(() => {
    const total = filteredByBranch.length;
    const completed = filteredByBranch.filter(
      (activity) => activity.status === "concluida"
    ).length;
    const late = filteredByBranch.filter(isLateActivity).length;
    const today = todayISO();
    const weekAhead = addDaysISO(7);
    const dueSoon = filteredByBranch.filter(
      (activity) =>
        PENDING.has(activity.status) &&
        activity.status !== "atrasada" &&
        !!activity.dueDate &&
        activity.dueDate >= today &&
        activity.dueDate <= weekAhead
    ).length;
    return {
      total,
      completed,
      completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      late,
      dueSoon,
    };
  }, [filteredByBranch]);

  const byStatus = React.useMemo(
    () =>
      ACTIVITY_STATUSES.map((status) => ({
        status,
        total: filteredByBranch.filter((activity) => activity.status === status)
          .length,
      })),
    [filteredByBranch]
  );

  const byProblem = React.useMemo(() => {
    const rows = problems.map((problem) => ({
      label: problem.title,
      total: filteredByBranch.filter(
        (activity) => activity.problemId === problem.id
      ).length,
    }));
    const unlinked = filteredByBranch.filter(
      (activity) => !activity.problemId
    ).length;
    if (unlinked > 0)
      rows.push({ label: "Sem problema vinculado", total: unlinked });
    return rows;
  }, [problems, filteredByBranch]);

  const critical = React.useMemo(
    () =>
      filteredByBranch
        .filter(
          (activity) =>
            PENDING.has(activity.status) && !!activity.dueDate
        )
        .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
        .slice(0, 5),
    [filteredByBranch]
  );

  const activitiesTabRows = React.useMemo(() => {
    let rows = filteredByBranch;

    if (activityStatus === "abertas") {
      rows = rows.filter((activity) => PENDING.has(activity.status));
    } else if (activityStatus === "concluidas") {
      rows = rows.filter((activity) => activity.status === "concluida");
    }
    if (search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      rows = rows.filter((activity) =>
        activity.title.toLowerCase().includes(term)
      );
    }
    if (categoryFilter) {
      rows = rows.filter((activity) => activity.category === categoryFilter);
    }
    if (problemFilter) {
      rows = rows.filter((activity) => activity.problemId === problemFilter);
    }
    if (onlyMine) {
      rows = rows.filter((activity) =>
        activity.assignees.some((assignee) => assignee.id === profileId)
      );
    }

    // Ordenação: atrasadas > próximas > concluídas.
    const rank = (activity: ActivityRow) => {
      if (activity.status === "atrasada") return 0;
      if (PENDING.has(activity.status)) return 1;
      return 2;
    };
    return [...rows].sort((a, b) => {
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
  }, [
    filteredByBranch,
    activityStatus,
    search,
    categoryFilter,
    problemFilter,
    onlyMine,
    profileId,
  ]);

  const mineCount = React.useMemo(
    () =>
      filteredByBranch.filter((activity) =>
        activity.assignees.some((assignee) => assignee.id === profileId)
      ).length,
    [filteredByBranch, profileId]
  );

  const showBranchFilter = channel.branches.length > 1;
  const showOnlyMine = mineCount > 0 && mineCount < filteredByBranch.length;

  const branchOptions = React.useMemo(
    () =>
      channel.branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
      })),
    [channel.branches]
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

  const problemOptions = React.useMemo(
    () =>
      problems.map((problem) => ({
        value: problem.id,
        label: problem.title,
      })),
    [problems]
  );

  const metricCards = [
    {
      label: "Total de atividades",
      value: metrics.total.toString(),
      icon: ClipboardList,
      tone: "default" as const,
    },
    {
      label: "Concluídas",
      value: metrics.completed.toString(),
      hint: `${metrics.completedPercent}%`,
      icon: CircleCheckBig,
      tone: "default" as const,
    },
    {
      label: "Atrasadas",
      value: metrics.late.toString(),
      icon: CircleAlert,
      tone: metrics.late > 0 ? ("alert" as const) : ("default" as const),
    },
    {
      label: "Vencem em 7 dias",
      value: metrics.dueSoon.toString(),
      icon: CalendarClock,
      tone: metrics.dueSoon > 0 ? ("alert" as const) : ("default" as const),
    },
  ];

  const activitiesFiltersActive =
    activityStatus !== "abertas" ||
    search.trim().length > 0 ||
    categoryFilter !== null ||
    problemFilter !== null ||
    onlyMine;

  function clearActivityFilters() {
    setActivityStatus("abertas");
    setSearch("");
    setCategoryFilter(null);
    setProblemFilter(null);
    setOnlyMine(false);
  }

  return (
    <>
      {/* Filtro global de filial */}
      {showBranchFilter ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label
            htmlFor="filtro-local-global"
            className="text-sm text-muted-foreground"
          >
            Local
          </Label>
          <SearchableSelect
            id="filtro-local-global"
            options={branchOptions}
            value={branchFilter}
            onValueChange={setBranchFilter}
            placeholder="Todas as filiais"
            className="w-56"
          />
          {branchFilter ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBranchFilter(null)}
            >
              Limpar
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Bloco 2 — métricas */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="gap-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardDescription>{metric.label}</CardDescription>
              <metric.icon
                className={cn(
                  "size-4 shrink-0 text-muted-foreground",
                  metric.tone === "alert" &&
                    "text-amber-600 dark:text-amber-400"
                )}
              />
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-3xl font-semibold tracking-tight tabular-nums",
                  metric.tone === "alert" &&
                    "text-amber-600 dark:text-amber-400"
                )}
              >
                {metric.value}
              </p>
              {metric.hint ? (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {metric.hint}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bloco 3 — tabs */}
      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="problemas">
            Problemas
            <span className="ml-1 tabular-nums text-muted-foreground">
              {problems.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="atividades">
            Atividades
            <span className="ml-1 tabular-nums text-muted-foreground">
              {filteredByBranch.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Visão geral: 2 gráficos + críticas full-width */}
        <TabsContent value="visao-geral" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Atividades por status</CardTitle>
                <CardDescription>
                  Distribuição das atividades do plano em cada status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivitiesStatusChart data={byStatus} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Atividades por problema</CardTitle>
                <CardDescription>
                  Onde o plano concentra esforço — e o débito de vínculo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivitiesByProblemChart data={byProblem} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Atividades críticas</CardTitle>
                <CardDescription>
                  As 5 pendentes mais atrasadas ou próximas do prazo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {critical.length === 0 ? (
                  <Empty className="py-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CircleCheckBig />
                      </EmptyMedia>
                      <EmptyTitle>Nenhuma atividade crítica</EmptyTitle>
                      <EmptyDescription>Bom trabalho.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="flex flex-col gap-2">
                    {critical.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Problemas — read-only para o RTV */}
        <TabsContent value="problemas" className="mt-4">
          {channel.plan ? (
            <ProblemsTab
              planId={channel.plan.id}
              problems={problems}
              activities={filteredByBranch}
              canEdit={false}
            />
          ) : (
            <Card>
              <CardContent>
                <Empty className="py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardList />
                    </EmptyMedia>
                    <EmptyTitle>Sem plano ativo</EmptyTitle>
                    <EmptyDescription>
                      Este canal ainda não tem um plano de safra ativo.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Atividades — busca, filtros e ActivityCards em coluna única */}
        <TabsContent value="atividades" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título..."
                className="h-10 max-w-64"
              />
              <div className="flex gap-2">
                {(
                  [
                    { value: "abertas", label: "Abertas" },
                    { value: "concluidas", label: "Concluídas" },
                    { value: "todas", label: "Todas" },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setActivityStatus(chip.value)}
                    className={cn(
                      "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                      activityStatus === chip.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              {categoryOptions.length > 0 ? (
                <SearchableSelect
                  options={categoryOptions}
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  placeholder="Categoria"
                  className="w-44"
                />
              ) : null}
              {problemOptions.length > 0 ? (
                <SearchableSelect
                  options={problemOptions}
                  value={problemFilter}
                  onValueChange={setProblemFilter}
                  placeholder="Problema"
                  className="w-48"
                />
              ) : null}
              {showOnlyMine ? (
                <label className="ml-auto flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={onlyMine}
                    onCheckedChange={(checked) => setOnlyMine(checked)}
                  />
                  Só minhas
                </label>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground tabular-nums">
              {activitiesTabRows.length} de {filteredByBranch.length} atividades
              {branchFilter ? " (filial atual)" : ""}
            </p>

            {activitiesTabRows.length === 0 ? (
              <Empty className="rounded-3xl border border-dashed py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardList />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma atividade nesse recorte</EmptyTitle>
                </EmptyHeader>
                {activitiesFiltersActive ? (
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearActivityFilters}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                ) : null}
              </Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {activitiesTabRows.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* FAB mobile — fixo no canto inferior direito, oculto em md+ */}
      <Link
        href={`/registrar?canal=${channel.id}`}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90 active:opacity-80 md:hidden"
      >
        <Camera className="size-5" />
        Registrar
      </Link>
    </>
  );
}

/** Também exporta os metricCards helper caso seja útil, mas fica interno. */
export type { ChannelDetail, ProblemRow, ActivityRow };
