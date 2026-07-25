"use client";

import * as React from "react";

import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  Target,
  X,
} from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import { SearchableSelect } from "@/components/app/searchable-select";
import {
  ActivityTable,
  type ActivityTableColumn,
} from "@/components/shared/activity-table";
import { ClickableCard } from "@/components/shared/clickable-card";
import { DeadlineText } from "@/components/shared/deadline-text";
import { StatCard } from "@/components/shared/stat-card";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { type ActivityStatus, OPEN_STATUSES, StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  ActivityRow,
  ChannelDetail,
  ProblemRow,
} from "@/lib/db/channels";
import { isLateActivity, todayISO } from "@/lib/db/status";
import { CATEGORY_LABELS, DEFAULT_PAGE_SIZE, type ActivityCategory } from "@/lib/config";
import { cn } from "@/lib/utils";

const PENDING = new Set<ActivityStatus>(OPEN_STATUSES);

type KpiFilter = "todos" | "concluidas" | "atrasadas" | "vencendo";

type SortKey = "prazo" | "status";
type SortDir = "asc" | "desc";


const CANAL_COLUMNS: ActivityTableColumn[] = [
  "atividade",
  "meta",
  "responsaveis",
  "prazo",
  "status",
  "acao",
];

function addDaysISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Visão do canal do RTV — uma tela focada em atividades: KPIs
 * clicáveis funcionam como filtros de status na tabela densa abaixo.
 * Metas do plano vivem em Sheet lateral acionável.
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
  const { openActivity } = useActivityDrawer();
  const { openWizard } = useWizardProvider();
  const isMobile = useIsMobile();
  const [branchFilter, setBranchFilterRaw] = React.useState<string | null>(
    null
  );
  const [kpiFilter, setKpiFilterRaw] = React.useState<KpiFilter>("todos");
  const [search, setSearchRaw] = React.useState("");
  const [categoryFilter, setCategoryFilterRaw] = React.useState<string | null>(
    null
  );
  // Esta é a visão de CANAL do RTV (/meus-canais): o padrão é "minhas"
  // — o modelo mental dele é o próprio trabalho, não o do canal inteiro.
  // Só desliga se ele não tiver atividade aqui (aí não há o que filtrar).
  const [onlyMine, setOnlyMineRaw] = React.useState(() =>
    activities.some((activity) =>
      activity.assignees.some((assignee) => assignee.id === profileId)
    )
  );
  const [problemFilter, setProblemFilterRaw] =
    React.useState<ProblemRow | null>(null);
  const [problemsOpen, setProblemsOpen] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>("prazo");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);

  // Todo filtro reseta a paginação NO PRÓPRIO evento (nada de effect —
  // setState em effect dispara render em cascata e o lint barra).
  const setBranchFilter = (value: string | null) => {
    setBranchFilterRaw(value);
    setPage(1);
  };
  const setKpiFilter = (value: KpiFilter) => {
    setKpiFilterRaw(value);
    setPage(1);
  };
  const setSearch = (value: string) => {
    setSearchRaw(value);
    setPage(1);
  };
  const setCategoryFilter = (value: string | null) => {
    setCategoryFilterRaw(value);
    setPage(1);
  };
  const setOnlyMine = (value: boolean) => {
    setOnlyMineRaw(value);
    setPage(1);
  };
  const setProblemFilter = (value: ProblemRow | null) => {
    setProblemFilterRaw(value);
    setPage(1);
  };

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

  // Aplica o filtro do KPI.
  const filteredByKpi = React.useMemo(() => {
    if (kpiFilter === "todos") return filteredByBranch;
    if (kpiFilter === "concluidas") {
      return filteredByBranch.filter(
        (activity) => activity.status === "concluida"
      );
    }
    if (kpiFilter === "atrasadas") {
      return filteredByBranch.filter(isLateActivity);
    }
    // vencendo em 7 dias
    const today = todayISO();
    const weekAhead = addDaysISO(7);
    return filteredByBranch.filter(
      (activity) =>
        PENDING.has(activity.status) &&
        activity.status !== "atrasada" &&
        !!activity.dueDate &&
        activity.dueDate >= today &&
        activity.dueDate <= weekAhead
    );
  }, [filteredByBranch, kpiFilter]);

  // Filtros adicionais da barra e do chip de problema.
  const filtered = React.useMemo(() => {
    let rows = filteredByKpi;
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
      rows = rows.filter((activity) => activity.problemId === problemFilter.id);
    }
    if (onlyMine) {
      rows = rows.filter((activity) =>
        activity.assignees.some((assignee) => assignee.id === profileId)
      );
    }
    return rows;
  }, [
    filteredByKpi,
    search,
    categoryFilter,
    onlyMine,
    problemFilter,
    profileId,
  ]);

  // Ordenação; default = prazo asc com atrasadas no topo.
  const sorted = React.useMemo(() => {
    const rows = [...filtered];
    if (sortKey === "prazo") {
      rows.sort((a, b) => {
        const lateA = a.status === "atrasada" ? 0 : 1;
        const lateB = b.status === "atrasada" ? 0 : 1;
        if (lateA !== lateB) return lateA - lateB;
        const dueA = a.dueDate ?? "9999-12-31";
        const dueB = b.dueDate ?? "9999-12-31";
        return sortDir === "asc"
          ? dueA.localeCompare(dueB)
          : dueB.localeCompare(dueA);
      });
    } else {
      rows.sort((a, b) => {
        const cmp = a.status.localeCompare(b.status);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / DEFAULT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = React.useMemo(
    () => sorted.slice((currentPage - 1) * DEFAULT_PAGE_SIZE, currentPage * DEFAULT_PAGE_SIZE),
    [sorted, currentPage]
  );

  const showBranchFilter = channel.branches.length > 1;
  const branchOptions = channel.branches.map((branch) => ({
    value: branch.id,
    label: branch.name,
  }));

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

  const mineCount = React.useMemo(
    () =>
      activities.filter((activity) =>
        activity.assignees.some((assignee) => assignee.id === profileId)
      ).length,
    [activities, profileId]
  );
  const showOnlyMine = mineCount > 0 && mineCount < activities.length;

  function clearFilters() {
    setKpiFilter("todos");
    setSearch("");
    setCategoryFilter(null);
    setOnlyMine(false);
    setProblemFilter(null);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <>
      {/* Filtro global de filial */}
      {showBranchFilter ? (
        <div className="flex flex-wrap items-center gap-2">
          <SearchableSelect
            id="filtro-local-global"
            options={branchOptions}
            value={branchFilter}
            onValueChange={setBranchFilter}
            placeholder="Todas as filiais"
            className="w-56 border-input bg-card"
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

      {/* KPIs clicáveis — mesmo componente de filtro da Minhas Atividades */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de atividades"
          value={metrics.total}
          sublabel="no plano"
          interactive
          active={kpiFilter === "todos"}
          onClick={() => setKpiFilter("todos")}
        />
        <StatCard
          title="Concluídas"
          value={metrics.completed}
          sublabel={`${metrics.completedPercent}% do total`}
          interactive
          active={kpiFilter === "concluidas"}
          onClick={() => setKpiFilter("concluidas")}
        />
        <StatCard
          title="Atrasadas"
          value={metrics.late}
          sublabel={metrics.late === 1 ? "precisa de atenção" : "precisam de atenção"}
          tone={metrics.late > 0 ? "warning" : "neutral"}
          interactive
          active={kpiFilter === "atrasadas"}
          onClick={() => setKpiFilter("atrasadas")}
        />
        <StatCard
          title="Vencem em 7 dias"
          value={metrics.dueSoon}
          sublabel="prazo próximo"
          interactive
          active={kpiFilter === "vencendo"}
          onClick={() => setKpiFilter("vencendo")}
        />
      </div>

      {/* Chip de problema selecionado no Sheet */}
      {problemFilter ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 py-1 pl-3 pr-1">
            <Target className="size-3" />
            Meta: {problemFilter.title}
            <button
              type="button"
              aria-label="Remover filtro de meta"
              onClick={() => setProblemFilter(null)}
              className="ml-1 flex size-4 items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="size-3" />
            </button>
          </Badge>
        </div>
      ) : null}

      {/* Filtros da tabela */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar atividade..."
              className="h-10 border-input bg-card pl-9"
            />
          </div>
          {categoryOptions.length > 0 ? (
            <SearchableSelect
              options={categoryOptions}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Categoria"
              className="h-10 min-w-40 border-input bg-card"
            />
          ) : null}
          {showOnlyMine ? (
            <label className="ml-auto flex items-center gap-2 text-sm text-foreground">
              <Switch
                checked={onlyMine}
                onCheckedChange={(checked) => setOnlyMine(checked)}
              />
              Só minhas
            </label>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {sorted.length} de {filteredByBranch.length} atividades
          {branchFilter ? " (filial atual)" : ""}
        </p>
      </div>

      {/* Tabela ou empty */}
      {activities.length === 0 ? (
        <Card>
          <CardContent>
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList />
                </EmptyMedia>
                <EmptyTitle>
                  Este canal não tem atividades cadastradas ainda.
                </EmptyTitle>
                <EmptyDescription>
                  Fale com o DSM do canal para planejar a safra.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent>
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>Nenhum resultado com esses filtros.</EmptyTitle>
              </EmptyHeader>
              <div className="pt-2">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </div>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop — tabela canônica */}
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <ActivityTable
              activities={paged}
              columns={CANAL_COLUMNS}
              onRowClick={(activity) => openActivity(activity.id)}
              rowAction="menu"
              onRegister={(activity) =>
                openWizard({ mode: "registrar", activityId: activity.id })
              }
              sort={{ key: sortKey, dir: sortDir, onToggle: toggleSort }}
            />
          </div>

          {/* Mobile — cards empilhados usando linhas simplificadas */}
          <div className="flex flex-col gap-2 md:hidden">
            {paged.map((activity) => {
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => openActivity(activity.id)}
                  className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/40"
                >
                  <p className="line-clamp-2 leading-snug font-medium">
                    {activity.title}
                  </p>
                  {activity.branchName ? (
                    <p className="text-sm text-muted-foreground">
                      {activity.branchName}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={activity.status} />
                    <DeadlineText
                      dueDate={activity.dueDate}
                      status={activity.status}
                      className="text-xs"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t pt-4">
              <p className="text-sm text-muted-foreground tabular-nums">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Drawer flutuante de metas (mesmo container do wizard) */}
      <Drawer
        open={problemsOpen}
        onOpenChange={setProblemsOpen}
        modal
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent
          className={cn(
            !isMobile && "data-[swipe-axis=x]:sm:[--drawer-content-width:28rem]"
          )}
        >
          <DrawerTitle className="sr-only">Metas do plano</DrawerTitle>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">
                Metas do plano
              </p>
              <DrawerDescription className="mt-0.5">
                As metas definidas no papel em branco desta safra.
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setProblemsOpen(false)}
              className="shrink-0"
            >
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {problems.length === 0 ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Target />
                  </EmptyMedia>
                  <EmptyTitle>Sem metas definidas</EmptyTitle>
                  <EmptyDescription>
                    Este canal ainda não tem metas cadastradas no plano.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              problems.map((problem) => {
                const linked = activities.filter(
                  (activity) => activity.problemId === problem.id
                );
                const completed = linked.filter(
                  (activity) => activity.status === "concluida"
                ).length;
                const percent =
                  linked.length > 0
                    ? Math.round((completed / linked.length) * 100)
                    : 0;
                return (
                  <ClickableCard
                    key={problem.id}
                    onClick={() => {
                      setProblemFilter(problem);
                      setProblemsOpen(false);
                    }}
                    className="flex flex-col gap-4 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-medium leading-snug">
                        {problem.title}
                      </p>
                      <Badge
                        variant="secondary"
                        className="shrink-0 tabular-nums"
                      >
                        {linked.length}{" "}
                        {linked.length === 1 ? "atividade" : "atividades"}
                      </Badge>
                    </div>
                    {problem.description ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {problem.description}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <Progress
                        value={percent}
                        className="flex-1 [&_[data-slot=progress-track]]:h-2"
                      />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {percent}%
                      </span>
                    </div>
                  </ClickableCard>
                );
              })
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Botao para abrir o Sheet - controlado por state via portal invisível.
          O trigger visível vive no PageShell.actions (page.tsx) — expose um
          "handle" via CustomEvent para permitir controle externo. */}
      <ProblemsSheetOpener onClick={() => setProblemsOpen(true)} />

      {/* FAB mobile — Nova atividade */}
      <Button
        variant="brand"
        onClick={() => openWizard({ channelId: channel.id })}
        className="fixed right-6 bottom-6 z-50 h-auto rounded-full px-5 py-3.5 text-sm font-semibold shadow-elevated md:hidden"
      >
        <Plus className="size-5" />
        Nova atividade
      </Button>
    </>
  );
}

/**
 * Registra um handler global para abrir o Sheet de problemas — o botão
 * visível fica no header do PageShell (server), então este handler é a
 * ponte entre eles via CustomEvent.
 */
function ProblemsSheetOpener({ onClick }: { onClick: () => void }) {
  React.useEffect(() => {
    const handler = () => onClick();
    window.addEventListener("open-problems-sheet", handler);
    return () => window.removeEventListener("open-problems-sheet", handler);
  }, [onClick]);
  return null;
}
