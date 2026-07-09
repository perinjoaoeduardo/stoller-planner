"use client";

import * as React from "react";
import Link from "next/link";

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
  ClipboardCheck,
  ClipboardList,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Target,
  X,
} from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import { CategoryBadge } from "@/components/app/category-badge";
import { SearchableSelect } from "@/components/app/searchable-select";
import { useWizardProvider } from "@/components/app/wizard-provider";
import {
  StatusBadge,
  type ActivityStatus,
} from "@/components/app/status-badge";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ActivityRow,
  ChannelDetail,
  ProblemRow,
} from "@/lib/db/channels";
import { isLateActivity, todayISO } from "@/lib/db/status";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import { cn } from "@/lib/utils";

const PENDING = new Set<ActivityStatus>([
  "planejada",
  "em_andamento",
  "atrasada",
]);

type KpiFilter = "todos" | "concluidas" | "atrasadas" | "vencendo";

type SortKey = "prazo" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

function addDaysISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  active,
  tone = "default",
  onClick,
  disabled,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof CircleAlert;
  active: boolean;
  tone?: "default" | "alert";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer p-0 gap-2 transition-colors",
        active
          ? "border-[#0063A7] bg-[#0063A7]/5 dark:bg-[#0063A7]/10"
          : "hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-pressed={active}
        disabled={disabled}
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
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);
  const [kpiFilter, setKpiFilter] = React.useState<KpiFilter>("todos");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    null
  );
  const [onlyMine, setOnlyMine] = React.useState(false);
  const [problemFilter, setProblemFilter] = React.useState<ProblemRow | null>(
    null
  );
  const [problemsOpen, setProblemsOpen] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>("prazo");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);

  // Reset paginação quando um filtro muda.
  React.useEffect(() => {
    setPage(1);
  }, [branchFilter, kpiFilter, search, categoryFilter, onlyMine, problemFilter]);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = React.useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
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

  const filtersActive =
    kpiFilter !== "todos" ||
    search.trim().length > 0 ||
    categoryFilter !== null ||
    onlyMine ||
    problemFilter !== null;

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

      {/* KPIs clicáveis */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Total de atividades"
          value={metrics.total}
          hint="no plano"
          icon={ClipboardList}
          active={kpiFilter === "todos"}
          onClick={() => setKpiFilter("todos")}
        />
        <KpiCard
          label="Concluídas"
          value={metrics.completed}
          hint={`${metrics.completedPercent}%`}
          icon={CircleCheckBig}
          active={kpiFilter === "concluidas"}
          onClick={() => setKpiFilter("concluidas")}
        />
        <KpiCard
          label="Atrasadas"
          value={metrics.late}
          icon={CircleAlert}
          tone={metrics.late > 0 ? "alert" : "default"}
          active={kpiFilter === "atrasadas"}
          onClick={() => setKpiFilter("atrasadas")}
        />
        <KpiCard
          label="Vencem em 7 dias"
          value={metrics.dueSoon}
          icon={CalendarClock}
          tone={metrics.dueSoon > 0 ? "alert" : "default"}
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
              className="h-10 pl-9"
            />
          </div>
          {categoryOptions.length > 0 ? (
            <SearchableSelect
              options={categoryOptions}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Categoria"
              className="h-10 min-w-40"
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
          {/* Desktop — tabela densa */}
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atividade</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Categoria
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Meta
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Responsáveis
                  </TableHead>
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
                  const open = PENDING.has(activity.status);
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
                      <TableCell className="hidden lg:table-cell">
                        {activity.category ? (
                          <CategoryBadge category={activity.category} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-48 truncate xl:table-cell">
                        {activity.problemTitle ? (
                          <span className="truncate">
                            {activity.problemTitle}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Sem vínculo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {activity.assignees.length > 0 ? (
                          <AvatarGroup>
                            {activity.assignees.slice(0, 3).map((assignee) => (
                              <Avatar key={assignee.id} size="sm">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {activity.assignees.length > 3 ? (
                              <AvatarGroupCount className="size-6 text-[10px]">
                                +{activity.assignees.length - 3}
                              </AvatarGroupCount>
                            ) : null}
                          </AvatarGroup>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
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
                                <DropdownMenuItem
                                  onClick={() =>
                                    openWizard({
                                      mode: "registrar",
                                      activityId: activity.id,
                                    })
                                  }
                                >
                                  <Camera />
                                  Registrar
                                </DropdownMenuItem>
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

          {/* Mobile — cards empilhados usando linhas simplificadas */}
          <div className="flex flex-col gap-2 md:hidden">
            {paged.map((activity) => {
              const overdue = activity.status === "atrasada";
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
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        overdue
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {activity.dueDate
                        ? format(parseISO(activity.dueDate), "dd MMM yyyy", {
                            locale: ptBR,
                          })
                        : "sem prazo"}
                    </span>
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

      {/* Sheet lateral de problemas */}
      <Sheet open={problemsOpen} onOpenChange={setProblemsOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Metas do plano</SheetTitle>
            <SheetDescription>
              As metas definidas no papel em branco desta safra.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 pb-6">
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
                  <Card
                    key={problem.id}
                    className="p-0 transition-colors hover:bg-muted/40"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProblemFilter(problem);
                        setProblemsOpen(false);
                      }}
                      className="flex w-full flex-col gap-3 p-5 text-left"
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
                    </button>
                  </Card>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Botao para abrir o Sheet - controlado por state via portal invisível.
          O trigger visível vive no PageShell.actions (page.tsx) — expose um
          "handle" via CustomEvent para permitir controle externo. */}
      <ProblemsSheetOpener onClick={() => setProblemsOpen(true)} />

      {/* FAB mobile — Nova atividade */}
      <button
        type="button"
        onClick={() => openWizard({ channelId: channel.id })}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90 active:opacity-80 md:hidden"
      >
        <Plus className="size-5" />
        Nova atividade
      </button>

      {/* Ícone auxiliar para lint (usado indireto no import) */}
      <span className="hidden">
        <ClipboardCheck />
      </span>
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
