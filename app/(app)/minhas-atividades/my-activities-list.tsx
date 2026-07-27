"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Search,
  SearchX,
} from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import {
  ActivityTable,
  type ActivityTableColumn,
} from "@/components/shared/activity-table";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityCard } from "@/components/app/activity-card";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import {
  type ActivityStatus,
  OPEN_STATUSES,
  STATUS_ORDER,
} from "@/components/shared/status-badge";
import { useWizardProvider } from "@/components/app/wizard-provider";
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
import { Switch } from "@/components/ui/switch";
import { CATEGORY_LABELS, DEFAULT_PAGE_SIZE, type ActivityCategory } from "@/lib/config";
import type { ActivityRow } from "@/lib/db/channels";

const OPEN = new Set<ActivityStatus>(OPEN_STATUSES);

type KpiFilter = "todos" | "abertas" | "atrasadas" | "concluidas";

type SortKey = "prazo" | "status";
type SortDir = "asc" | "desc";


/** Aceita o mesmo range de status já usado no page.tsx. */
export type InitialStatus = KpiFilter | "todas";

/**
 * Lista de atividades ÚNICA do app — serve o RTV (só as dele) e o DSM
 * (as do time, com filtro de responsável e toggle "Só minhas"). Antes o
 * DSM tinha uma lista própria, em seções colapsáveis, com outra cara e
 * outra ordenação para a mesma informação: dois jeitos de ler a mesma
 * coisa é carga cognitiva pura (Nielsen #4, consistência).
 *
 * Padrão: KPIs clicáveis filtram por status a tabela densa abaixo;
 * filtros hierárquicos Canal → Filial → Meta.
 */
export function MyActivitiesList({
  activities,
  initialStatus = "abertas",
  currentUserId,
  responsibles,
}: {
  activities: ActivityRow[];
  initialStatus?: InitialStatus;
  /** Habilita o toggle "Só minhas" (gestor que também executa). */
  currentUserId?: string;
  /** Habilita o filtro de responsável e a coluna de avatares. */
  responsibles?: SelectOption[];
}) {
  const isTeamView = !!responsibles && responsibles.length > 0;
  const columns: ActivityTableColumn[] = isTeamView
    ? ["atividade", "meta", "responsaveis", "prazo", "status", "acao"]
    : ["atividade", "meta", "prazo", "status", "acao"];
  const { openActivity } = useActivityDrawer();
  const { openWizard } = useWizardProvider();

  // Mapeia initialStatus legado (P10) para o novo KpiFilter.
  const mapInitial = (s: InitialStatus): KpiFilter =>
    s === "todas" ? "todos" : s;

  const [kpiFilter, setKpiFilterRaw] = React.useState<KpiFilter>(
    mapInitial(initialStatus)
  );
  const [search, setSearchRaw] = React.useState("");
  const [channelId, setChannelIdRaw] = React.useState<string | null>(null);
  const [branchId, setBranchIdRaw] = React.useState<string | null>(null);
  const [categoryFilter, setCategoryFilterRaw] = React.useState<string | null>(
    null
  );
  const [metaFilter, setMetaFilterRaw] = React.useState<string | null>(null);
  const [responsibleFilter, setResponsibleFilterRaw] = React.useState<
    string | null
  >(null);
  const [onlyMine, setOnlyMineRaw] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>("prazo");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);

  // Todo filtro reseta a paginação NO PRÓPRIO evento (nada de effect —
  // setState em effect dispara render em cascata e o lint barra).
  const setKpiFilter = (value: KpiFilter) => {
    setKpiFilterRaw(value);
    setPage(1);
  };
  const setSearch = (value: string) => {
    setSearchRaw(value);
    setPage(1);
  };
  const setBranchId = (value: string | null) => {
    setBranchIdRaw(value);
    setPage(1);
  };
  const setCategoryFilter = (value: string | null) => {
    setCategoryFilterRaw(value);
    setPage(1);
  };
  const setMetaFilter = (value: string | null) => {
    setMetaFilterRaw(value);
    setPage(1);
  };
  const setResponsibleFilter = (value: string | null) => {
    setResponsibleFilterRaw(value);
    setPage(1);
  };
  const setOnlyMine = (value: boolean) => {
    setOnlyMineRaw(value);
    // "Só minhas" e o seletor de responsável dizem a mesma coisa —
    // deixar os dois ligados ao mesmo tempo gera estado contraditório.
    if (value) setResponsibleFilterRaw(null);
    setPage(1);
  };

  /** É do usuário se ele responde por ela ou está entre os assignees. */
  const isMine = React.useCallback(
    (activity: ActivityRow) =>
      !!currentUserId &&
      (activity.responsibleId === currentUserId ||
        activity.assignees.some((a) => a.id === currentUserId)),
    [currentUserId]
  );
  // Trocar de canal também derruba filial e meta (filtros hierárquicos).
  const setChannelId = (value: string | null) => {
    setChannelIdRaw(value);
    setBranchIdRaw(null);
    setMetaFilterRaw(null);
    setPage(1);
  };

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

  // Filiais e metas do canal selecionado (para o filtro hierárquico).
  const channelBranches = React.useMemo(() => {
    if (!channelId) return [];
    const seen = new Map<string, string>();
    for (const activity of activities) {
      if (
        activity.channelId === channelId &&
        activity.branchId &&
        activity.branchName &&
        !seen.has(activity.branchId)
      ) {
        seen.set(activity.branchId, activity.branchName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activities, channelId]);

  const channelMetas = React.useMemo(() => {
    if (!channelId) return [];
    const seen = new Map<string, string>();
    for (const activity of activities) {
      if (
        activity.channelId === channelId &&
        activity.problemId &&
        activity.problemTitle &&
        !seen.has(activity.problemId)
      ) {
        seen.set(activity.problemId, activity.problemTitle);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activities, channelId]);

  const showBranchFilter = !!channelId && channelBranches.length > 1;
  const showMetaFilter = !!channelId && channelMetas.length > 0;

  const channelOptions: SelectOption[] = React.useMemo(
    () => channels.map((c) => ({ value: c.id, label: c.name })),
    [channels]
  );
  const branchOptions: SelectOption[] = React.useMemo(
    () => channelBranches.map((b) => ({ value: b.id, label: b.name })),
    [channelBranches]
  );
  const metaOptions: SelectOption[] = React.useMemo(
    () => [
      { value: "__none__", label: "Sem meta vinculada" },
      ...channelMetas.map((m) => ({ value: m.id, label: m.name })),
    ],
    [channelMetas]
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

  // KPIs sempre absolutos (não afetados pelo filtro do próprio KPI).
  const metrics = React.useMemo(() => {
    const total = activities.length;
    const open = activities.filter((a) => OPEN.has(a.status)).length;
    const late = activities.filter((a) => a.status === "atrasada").length;
    const completed = activities.filter((a) => a.status === "concluida").length;
    const completedPercent =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, open, late, completed, completedPercent };
  }, [activities]);

  // Aplica o filtro do KPI.
  const filteredByKpi = React.useMemo(() => {
    if (kpiFilter === "todos") return activities;
    if (kpiFilter === "abertas") {
      return activities.filter((a) => a.status === "planejada");
    }
    if (kpiFilter === "atrasadas") {
      return activities.filter((a) => a.status === "atrasada");
    }
    return activities.filter((a) => a.status === "concluida");
  }, [activities, kpiFilter]);

  const filtered = React.useMemo(() => {
    let rows = filteredByKpi;
    if (search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      rows = rows.filter((a) => a.title.toLowerCase().includes(term));
    }
    if (channelId) {
      rows = rows.filter((a) => a.channelId === channelId);
    }
    if (branchId) {
      rows = rows.filter((a) => a.branchId === branchId);
    }
    if (categoryFilter) {
      rows = rows.filter((a) => a.category === categoryFilter);
    }
    if (metaFilter) {
      if (metaFilter === "__none__") {
        rows = rows.filter((a) => !a.problemId);
      } else {
        rows = rows.filter((a) => a.problemId === metaFilter);
      }
    }
    if (onlyMine) {
      rows = rows.filter(isMine);
    } else if (responsibleFilter) {
      rows = rows.filter(
        (a) =>
          a.responsibleId === responsibleFilter ||
          a.assignees.some((assignee) => assignee.id === responsibleFilter)
      );
    }
    return rows;
  }, [
    filteredByKpi,
    search,
    channelId,
    branchId,
    categoryFilter,
    metaFilter,
    onlyMine,
    responsibleFilter,
    isMine,
  ]);

  const sorted = React.useMemo(() => {
    const rows = [...filtered];
    // O status manda em qualquer ordenação (STATUS_ORDER é canônico):
    // atrasada → planejada → concluída → cancelada. Sem isso, planejada
    // e concluída se intercalavam por data e a lista virava um vaivém
    // entre "tenho que fazer" e "já foi". A data só desempata DENTRO
    // do mesmo status — inclusive quando o usuário inverte a direção.
    rows.sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      if (sortKey === "status") return 0;
      const dueA = a.dueDate ?? "9999-12-31";
      const dueB = b.dueDate ?? "9999-12-31";
      return sortDir === "asc"
        ? dueA.localeCompare(dueB)
        : dueB.localeCompare(dueA);
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / DEFAULT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = React.useMemo(
    () => sorted.slice((currentPage - 1) * DEFAULT_PAGE_SIZE, currentPage * DEFAULT_PAGE_SIZE),
    [sorted, currentPage]
  );

  const filtersActive =
    kpiFilter !== "todos" ||
    search.trim().length > 0 ||
    channelId !== null ||
    branchId !== null ||
    categoryFilter !== null ||
    metaFilter !== null ||
    responsibleFilter !== null ||
    onlyMine;

  function clearFilters() {
    setKpiFilter("todos");
    setSearch("");
    setChannelId(null);
    setBranchId(null);
    setCategoryFilter(null);
    setMetaFilter(null);
    setResponsibleFilter(null);
    setOnlyMine(false);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // Sem nenhuma atividade — empty central com CTA.
  if (activities.length === 0) {
    return (
      <Empty className="flex-1 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListTodo />
          </EmptyMedia>
          <EmptyTitle>
            {isTeamView
              ? "Nenhuma atividade nos seus canais"
              : "Nenhuma atividade atribuída a você"}
          </EmptyTitle>
          <EmptyDescription>
            Use “Nova atividade” no topo da tela para registrar uma ação
            avulsa a qualquer momento.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      {/* KPIs clicáveis */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total"
          value={metrics.total}
          sublabel="no total"
          interactive
          active={kpiFilter === "todos"}
          onClick={() => setKpiFilter("todos")}
        />
        <StatCard
          title="Abertas"
          value={metrics.open - metrics.late}
          sublabel="em andamento"
          tone="info"
          interactive
          active={kpiFilter === "abertas"}
          onClick={() => setKpiFilter("abertas")}
        />
        <StatCard
          title="Atrasadas"
          value={metrics.late}
          sublabel={
            metrics.late === 1 ? "precisa de atenção" : "precisam de atenção"
          }
          tone="warning"
          interactive
          active={kpiFilter === "atrasadas"}
          onClick={() => setKpiFilter("atrasadas")}
        />
        <StatCard
          title="Concluídas"
          value={metrics.completed}
          sublabel={`${metrics.completedPercent}% do total`}
          tone="success"
          interactive
          active={kpiFilter === "concluidas"}
          onClick={() => setKpiFilter("concluidas")}
        />
      </div>

      {/*
        Filtros em DUAS linhas com significados separados, em vez de uma
        fileira única que rearranjava tudo a cada seleção:
        1) "o quê / de quem" — busca, categoria e o recorte de pessoa;
        2) "onde" — o drill hierárquico Canal → Filial → Meta.
        Filial e Meta nascem DENTRO da linha do canal, então aparecem
        como desdobramento dele e não como filtros novos empurrando a
        primeira linha para baixo.
      */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título..."
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
          {isTeamView ? (
            <SearchableSelect
              options={responsibles!}
              value={responsibleFilter}
              onValueChange={(value) => {
                setResponsibleFilter(value);
                if (value) setOnlyMineRaw(false);
              }}
              placeholder="Responsável"
              className="h-10 min-w-44 border-input bg-card"
            />
          ) : null}
          {currentUserId ? (
            <label className="flex shrink-0 items-center gap-2 text-sm text-foreground">
              <Switch
                checked={onlyMine}
                onCheckedChange={(checked) => setOnlyMine(checked)}
              />
              Só minhas
            </label>
          ) : null}
        </div>

        {showChannelFilter ? (
          <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              options={channelOptions}
              value={channelId}
              onValueChange={setChannelId}
              placeholder="Todos os canais"
              className="h-10 min-w-44 border-input bg-card"
            />
            {showBranchFilter || showMetaFilter ? (
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            ) : null}
            {showBranchFilter ? (
              <SearchableSelect
                options={branchOptions}
                value={branchId}
                onValueChange={setBranchId}
                placeholder="Todas as filiais"
                className="h-10 min-w-44 border-input bg-card"
              />
            ) : null}
            {showMetaFilter ? (
              <SearchableSelect
                options={metaOptions}
                value={metaFilter}
                onValueChange={setMetaFilter}
                placeholder="Meta"
                className="h-10 min-w-44 border-input bg-card"
              />
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground tabular-nums">
            {sorted.length} de {activities.length} atividades
          </p>
          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tabela ou empty */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent>
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>Nenhum resultado com esses filtros.</EmptyTitle>
              </EmptyHeader>
              {filtersActive ? (
                <div className="pt-2">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                </div>
              ) : null}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop — tabela canônica */}
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <ActivityTable
              activities={paged}
              columns={columns}
              onRowClick={(activity) => openActivity(activity.id)}
              rowAction="menu"
              onRegister={(activity) =>
                openWizard({ mode: "registrar", activityId: activity.id })
              }
              sort={{ key: sortKey, dir: sortDir, onToggle: toggleSort }}
            />
          </div>

          {/* Mobile — ActivityCards empilhados */}
          <div className="flex flex-col gap-2 md:hidden">
            {paged.map((activity) => (
              <ActivityCard
                key={activity.id}
                showCanal={!channelId}
                activity={activity}
              />
            ))}
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
    </>
  );
}
