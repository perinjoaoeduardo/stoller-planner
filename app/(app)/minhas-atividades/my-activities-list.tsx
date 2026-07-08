"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  ClipboardList,
  Eye,
  ListTodo,
  MoreHorizontal,
  Plus,
  Search,
  SearchX,
} from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import { ActivityCard } from "@/components/app/activity-card";
import { CategoryBadge } from "@/components/app/category-badge";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import {
  StatusBadge,
  type ActivityStatus,
} from "@/components/app/status-badge";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import type { ActivityRow } from "@/lib/db/channels";
import { cn } from "@/lib/utils";

const OPEN = new Set<ActivityStatus>([
  "planejada",
  "em_andamento",
  "atrasada",
]);

type KpiFilter = "todos" | "abertas" | "atrasadas" | "concluidas";

type SortKey = "prazo" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

/** Aceita o mesmo range de status já usado no page.tsx. */
export type InitialStatus = KpiFilter | "todas";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  active,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof CircleAlert;
  active: boolean;
  tone?: "default" | "alert";
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "gap-2 p-0 transition-colors",
        active
          ? "border-[#0063A7] bg-[#0063A7]/5 dark:bg-[#0063A7]/10"
          : "hover:bg-muted/30"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className="w-full p-6 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon
            className={cn(
              "size-4 shrink-0",
              tone === "alert"
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          />
        </div>
        <p
          className={cn(
            "mt-3 text-3xl font-semibold tracking-tight tabular-nums",
            tone === "alert" && "text-amber-600 dark:text-amber-400"
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {hint}
          </p>
        ) : null}
      </button>
    </Card>
  );
}

/**
 * Visão pessoal do RTV — herda o padrão da visão do canal: KPIs
 * clicáveis funcionam como filtros de status na tabela densa abaixo.
 * Filtros hierárquicos: Canal → Filial → Meta.
 */
function WizardEmptyButton() {
  const { openWizard } = useWizardProvider();
  return (
    <Button onClick={() => openWizard()}>
      <Plus className="size-4" />
      Nova atividade
    </Button>
  );
}

function RegisterMenuItem({ activityId }: { activityId: string }) {
  const { openWizard } = useWizardProvider();
  return (
    <DropdownMenuItem
      onClick={() =>
        openWizard({ mode: "registrar", activityId })
      }
    >
      <Camera />
      Registrar
    </DropdownMenuItem>
  );
}

export function MyActivitiesList({
  activities,
  initialStatus = "abertas",
}: {
  activities: ActivityRow[];
  initialStatus?: InitialStatus;
}) {
  const { openActivity } = useActivityDrawer();

  // Mapeia initialStatus legado (P10) para o novo KpiFilter.
  const mapInitial = (s: InitialStatus): KpiFilter =>
    s === "todas" ? "todos" : s;

  const [kpiFilter, setKpiFilter] = React.useState<KpiFilter>(
    mapInitial(initialStatus)
  );
  const [search, setSearch] = React.useState("");
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    null
  );
  const [metaFilter, setMetaFilter] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("prazo");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);

  // Reset paginação quando qualquer filtro muda.
  React.useEffect(() => {
    setPage(1);
  }, [kpiFilter, search, channelId, branchId, categoryFilter, metaFilter]);

  // Reset filial e meta quando o canal muda.
  const previousChannel = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (previousChannel.current !== channelId) {
      previousChannel.current = channelId;
      setBranchId(null);
      setMetaFilter(null);
    }
  }, [channelId]);

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
      return activities.filter(
        (a) => a.status === "planejada" || a.status === "em_andamento"
      );
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
    return rows;
  }, [filteredByKpi, search, channelId, branchId, categoryFilter, metaFilter]);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = React.useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  const filtersActive =
    kpiFilter !== "todos" ||
    search.trim().length > 0 ||
    channelId !== null ||
    branchId !== null ||
    categoryFilter !== null ||
    metaFilter !== null;

  function clearFilters() {
    setKpiFilter("todos");
    setSearch("");
    setChannelId(null);
    setBranchId(null);
    setCategoryFilter(null);
    setMetaFilter(null);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) {
      return (
        <ArrowUpDown className="ml-1 inline size-3 text-muted-foreground/60" />
      );
    }
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline size-3" />
    ) : (
      <ArrowDown className="ml-1 inline size-3" />
    );
  }

  // Sem nenhuma atividade — empty central com CTA.
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
          <WizardEmptyButton />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      {/* KPIs clicáveis */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Total"
          value={metrics.total}
          hint="no total"
          icon={ClipboardList}
          active={kpiFilter === "todos"}
          onClick={() => setKpiFilter("todos")}
        />
        <KpiCard
          label="Abertas"
          value={metrics.open - metrics.late}
          hint="em andamento"
          icon={ListTodo}
          active={kpiFilter === "abertas"}
          onClick={() => setKpiFilter("abertas")}
        />
        <KpiCard
          label="Atrasadas"
          value={metrics.late}
          hint={
            metrics.late === 1 ? "precisa de atenção" : "precisam de atenção"
          }
          icon={CircleAlert}
          tone={metrics.late > 0 ? "alert" : "default"}
          active={kpiFilter === "atrasadas"}
          onClick={() => setKpiFilter("atrasadas")}
        />
        <KpiCard
          label="Concluídas"
          value={metrics.completed}
          hint={`${metrics.completedPercent}% do total`}
          icon={CircleCheckBig}
          active={kpiFilter === "concluidas"}
          onClick={() => setKpiFilter("concluidas")}
        />
      </div>

      {/* Filtros da tabela */}
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
          {showChannelFilter ? (
            <SearchableSelect
              options={channelOptions}
              value={channelId}
              onValueChange={setChannelId}
              placeholder="Todos os canais"
              className="h-10 min-w-44"
            />
          ) : null}
          {showBranchFilter ? (
            <SearchableSelect
              options={branchOptions}
              value={branchId}
              onValueChange={setBranchId}
              placeholder="Todas as filiais"
              className="h-10 min-w-44"
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
          {showMetaFilter ? (
            <SearchableSelect
              options={metaOptions}
              value={metaFilter}
              onValueChange={setMetaFilter}
              placeholder="Meta"
              className="h-10 min-w-44"
            />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {sorted.length} de {activities.length} atividades
        </p>
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
          {/* Desktop — tabela densa */}
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atividade</TableHead>
                  <TableHead className="hidden lg:table-cell">Canal</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Categoria
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">Meta</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => toggleSort("prazo")}
                      className="flex items-center hover:text-foreground"
                    >
                      Prazo
                      <SortIcon column="prazo" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => toggleSort("status")}
                      className="flex items-center hover:text-foreground"
                    >
                      Status
                      <SortIcon column="status" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((activity) => {
                  const overdue = activity.status === "atrasada";
                  const open = OPEN.has(activity.status);
                  return (
                    <TableRow
                      key={activity.id}
                      className="cursor-pointer"
                      onClick={() =>
                        openActivity(activity.id)
                      }
                    >
                      <TableCell className="max-w-72">
                        <p className="truncate font-medium">
                          {activity.title}
                        </p>
                        {activity.branchName ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {activity.branchName}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden max-w-40 lg:table-cell">
                        <p className="truncate">{activity.channelName}</p>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {activity.category ? (
                          <CategoryBadge category={activity.category} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-48 xl:table-cell">
                        {activity.problemTitle ? (
                          <p className="truncate">{activity.problemTitle}</p>
                        ) : (
                          <p className="italic text-muted-foreground">
                            Sem vínculo
                          </p>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap tabular-nums",
                          overdue
                            ? "font-medium text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {activity.dueDate
                          ? format(parseISO(activity.dueDate), "dd MMM yyyy", {
                              locale: ptBR,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={activity.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          onClick={(event) => event.stopPropagation()}
                          className="flex justify-end"
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Ações"
                                >
                                  <MoreHorizontal />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              {open ? (
                                <RegisterMenuItem activityId={activity.id} />
                              ) : null}
                              <DropdownMenuItem
                                onClick={() =>
                                  openActivity(activity.id)
                                }
                              >
                                <Eye />
                                Ver detalhes
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

      {/* Ícone de calendário auxiliar (mantém import se algum dia usar). */}
      <span className="hidden">
        <CalendarClock />
      </span>
    </>
  );
}
