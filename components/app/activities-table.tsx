"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowDownWideNarrow,
  ArrowUp,
  ArrowUpDown,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ListFilter,
  Plus,
  Search,
  Settings2,
  TriangleAlert,
} from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { ActivityRow as ActivityRowItem } from "@/components/shared/activity-row";
import { CategoryIconBox } from "@/components/shared/icon-box";
import { DeadlineText } from "@/components/shared/deadline-text";
import { TruncatedText } from "@/components/shared/truncated-text";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import {
  ACTIVITY_STATUSES,
  STATUS_LABELS,
  StatusBadge,
  type ActivityStatus,
} from "@/components/shared/status-badge";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
import { ACTIVITY_CATEGORIES, CATEGORY_LABELS, DEFAULT_PAGE_SIZE, type ActivityCategory } from "@/lib/config";
import type { ActivityRow } from "@/lib/db/channels";
import { cn, getInitials } from "@/lib/utils";

const STATUS_SORT_ORDER: Record<ActivityStatus, number> = {
  atrasada: 0,
  planejada: 1,
  concluida: 2,
  nao_feita: 3,
};

const COLUMN_LABELS: Record<string, string> = {
  title: "Atividade",
  channel: "Canal",
  problem: "Meta",
  responsible: "Responsável",
  dueDate: "Prazo",
  status: "Status",
};

// ── Buckets dos StatCards (visão global) ───────────────────────────────
type Bucket = "atrasada" | "semana" | "proximas" | "concluida" | "outras";

function bucketOf(activity: ActivityRow, today: Date): Bucket {
  if (activity.status === "concluida") return "concluida";
  if (activity.status === "atrasada") return "atrasada";
  if (activity.dueDate) {
    const days = differenceInCalendarDays(parseISO(activity.dueDate), today);
    if (days >= 0 && days <= 7) return "semana";
    if (days >= 8 && days <= 30) return "proximas";
  }
  return "outras";
}

// ── Seções temporais da lista (visão global) ───────────────────────────
type SectionId =
  | "atrasadas"
  | "esta-semana"
  | "proximas-2-semanas"
  | "depois"
  | "sem-prazo"
  | "concluidas";

const SECTION_ORDER: SectionId[] = [
  "atrasadas",
  "esta-semana",
  "proximas-2-semanas",
  "depois",
  "sem-prazo",
  "concluidas",
];

const SECTION_LABELS: Record<SectionId, string> = {
  atrasadas: "Atrasadas",
  "esta-semana": "Esta semana",
  "proximas-2-semanas": "Próximas 2 semanas",
  depois: "Depois",
  "sem-prazo": "Sem prazo",
  concluidas: "Concluídas",
};

const DEFAULT_OPEN: Record<SectionId, boolean> = {
  atrasadas: true,
  "esta-semana": true,
  "proximas-2-semanas": true,
  depois: false,
  "sem-prazo": false,
  concluidas: false,
};

function sectionOf(activity: ActivityRow, today: Date): SectionId {
  if (activity.status === "concluida" || activity.status === "nao_feita") {
    // Encerradas (concluída ou cancelada) caem na seção Concluídas —
    // que só aparece com o StatCard Concluídas ativo.
    return "concluidas";
  }
  if (activity.status === "atrasada") return "atrasadas";
  if (!activity.dueDate) return "sem-prazo";
  const days = differenceInCalendarDays(parseISO(activity.dueDate), today);
  if (days < 0) return "atrasadas";
  if (days <= 7) return "esta-semana";
  if (days <= 14) return "proximas-2-semanas";
  return "depois";
}

// ── Ordenação da lista global ──────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "prazo-asc", label: "Prazo (mais próximo primeiro)" },
  { value: "prazo-desc", label: "Prazo (mais distante primeiro)" },
  { value: "criacao-recente", label: "Criação recente" },
] as const;
type SortMode = (typeof SORT_OPTIONS)[number]["value"];

function sortActivities(
  activities: ActivityRow[],
  mode: SortMode
): ActivityRow[] {
  const list = [...activities];
  if (mode === "criacao-recente") {
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return list;
  }
  const dir = mode === "prazo-asc" ? 1 : -1;
  list.sort((a, b) => {
    // Sem prazo vai sempre pro fim, independente da direção.
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -dir : a.dueDate > b.dueDate ? dir : 0;
  });
  return list;
}

// ── Filtro Prazo (linha de controle, único) ────────────────────────────
const PRAZO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "esta-semana", label: "Esta semana" },
  { value: "proximas-2-semanas", label: "Próximas 2 semanas" },
  { value: "este-mes", label: "Este mês" },
  { value: "vencidos", label: "Vencidos" },
] as const;
type PrazoFilter = (typeof PRAZO_OPTIONS)[number]["value"];

function prazoMatches(
  activity: ActivityRow,
  prazo: PrazoFilter,
  today: Date
): boolean {
  if (prazo === "todos") return true;
  if (prazo === "vencidos") return activity.status === "atrasada";
  if (!activity.dueDate) return false;
  const dt = parseISO(activity.dueDate);
  const days = differenceInCalendarDays(dt, today);
  if (prazo === "esta-semana") return days >= 0 && days <= 7;
  if (prazo === "proximas-2-semanas") return days >= 0 && days <= 14;
  if (prazo === "este-mes") {
    return (
      dt.getFullYear() === today.getFullYear() &&
      dt.getMonth() === today.getMonth()
    );
  }
  return true;
}

/** Header ordenável (uppercase herdado + seta direcional). */
function SortHeader({
  label,
  column,
}: {
  label: string;
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="flex cursor-pointer items-center uppercase hover:text-foreground"
    >
      {label}
      <Icon className="ml-1 inline size-3.5 text-muted-foreground" />
    </button>
  );
}

/** Trigger multi-select no padrão dropdown+checkbox do projeto. */
function MultiFilterButton({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <Button variant="outline" size="sm" className="h-9">
      <ListFilter />
      {label}
      {count > 0 ? (
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      ) : null}
    </Button>
  );
}

/**
 * DataTable de atividades — a tela mais usada do produto.
 *
 * Dois variants:
 * - "channel" (default): visão do canal, filtros clássicos (Status,
 *   Categoria, Meta, Filial, Responsável) + toggle de colunas +
 *   contador "X de Y".
 * - "global": /atividades. Header reformado — 4 StatCards clicáveis
 *   (Atrasadas / Esta semana / Próximas / Concluídas, união) +
 *   linha de controle (Busca + Só minhas + Canal + Tipo + Responsável +
 *   Prazo). Sem pills antigos, sem contador à direita, sem Colunas.
 */
export function ActivitiesTable({
  data,
  problems,
  branches,
  responsibles,
  canEdit,
  showChannel = false,
  onCreate,
  onEdit,
  variant = "channel",
  currentUserId = null,
  channels = [],
}: {
  data: ActivityRow[];
  problems: SelectOption[];
  branches: SelectOption[];
  responsibles: SelectOption[];
  canEdit: boolean;
  showChannel?: boolean;
  onCreate?: () => void;
  onEdit?: (activity: ActivityRow) => void;
  variant?: "channel" | "global";
  /** ID do usuário logado, usado pelo toggle "Só minhas" no variant global. */
  currentUserId?: string | null;
  /** Opções do filtro Canal do variant global (id → nome). */
  channels?: SelectOption[];
}) {
  const isGlobal = variant === "global";
  const { openActivity } = useActivityDrawer();
  const { openWizard } = useWizardProvider();

  // "Hoje" fixado no mount para os buckets/prazo não flutuarem entre renders.
  const today = React.useMemo(() => new Date(), []);

  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(
    () => searchParams.get("q") ?? ""
  );

  // ── Filtros do variant "channel" (compatibilidade) ───────────────────
  const [statusFilter, setStatusFilter] = React.useState<ActivityStatus[]>(() =>
    isGlobal
      ? []
      : (searchParams.get("status") ?? "")
          .split(",")
          .filter((value): value is ActivityStatus =>
            (ACTIVITY_STATUSES as string[]).includes(value)
          )
  );
  const [problemFilter, setProblemFilter] = React.useState<string | null>(null);
  const [branchFilter, setBranchFilter] = React.useState<string | null>(() =>
    isGlobal ? null : searchParams.get("filial")
  );

  // ── Filtros compartilhados ───────────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = React.useState<
    ActivityCategory[]
  >(() =>
    (searchParams.get("categoria") ?? "")
      .split(",")
      .filter((value): value is ActivityCategory =>
        (ACTIVITY_CATEGORIES as readonly string[]).includes(value)
      )
  );

  // Canal: multi no variant global; no channel variant não se aplica.
  const [channelFilter, setChannelFilter] = React.useState<string[]>([]);

  // Responsável: multi no variant global; single (SearchableSelect) no channel.
  // ?responsavel= funciona nos dois (deep link do perfil de pessoa e da
  // home do DSM).
  const [responsibleFilter, setResponsibleFilter] = React.useState<
    string | null
  >(() => (isGlobal ? null : searchParams.get("responsavel")));
  const [responsibleMulti, setResponsibleMulti] = React.useState<string[]>(
    () => {
      if (!isGlobal) return [];
      const param = searchParams.get("responsavel");
      return param ? [param] : [];
    }
  );

  // ── Filtros específicos do variant "global" ──────────────────────────
  // Os KPIs se comportam como radio: só um filtro por vez. Clicar no
  // ativo desliga. Isso troca o balde visível; não some com nada por
  // default — concluídas + canceladas ficam sempre embaixo.
  const [bucketFilter, setBucketFilter] = React.useState<Bucket | null>(null);
  const [onlyMine, setOnlyMine] = React.useState(false);
  const [prazoFilter, setPrazoFilter] = React.useState<PrazoFilter>("todos");
  const [sortMode, setSortMode] = React.useState<SortMode>("prazo-asc");
  const [sectionOpen, setSectionOpen] =
    React.useState<Record<SectionId, boolean>>(DEFAULT_OPEN);

  function toggleSection(id: SectionId) {
    setSectionOpen((current) => ({ ...current, [id]: !current[id] }));
  }

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  function toggleBucket(bucket: Bucket) {
    setBucketFilter((current) => (current === bucket ? null : bucket));
  }

  const hasFilters = isGlobal
    ? search.trim() !== "" ||
      bucketFilter !== null ||
      onlyMine ||
      channelFilter.length > 0 ||
      categoryFilter.length > 0 ||
      responsibleMulti.length > 0 ||
      prazoFilter !== "todos"
    : search.trim() !== "" ||
      statusFilter.length > 0 ||
      categoryFilter.length > 0 ||
      !!problemFilter ||
      !!branchFilter ||
      !!responsibleFilter;

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    // Responsáveis efetivos no variant global: seleção explícita vence o
    // toggle "Só minhas".
    const effectiveResponsibles = isGlobal
      ? responsibleMulti.length > 0
        ? responsibleMulti
        : onlyMine && currentUserId
          ? [currentUserId]
          : []
      : [];

    return data.filter((activity) => {
      // Busca
      if (term && !activity.title.toLowerCase().includes(term)) return false;

      if (isGlobal) {
        // KPIs viraram radio: 1 filtro por vez, ou nenhum (mostra tudo).
        // Concluídas + Canceladas ficam sempre embaixo — sem filtro
        // implícito escondendo nada.
        if (bucketFilter) {
          const bucket = bucketOf(activity, today);
          if (bucket !== bucketFilter) return false;
        }
        // Canal (multi)
        if (
          channelFilter.length > 0 &&
          !channelFilter.includes(activity.channelId)
        ) {
          return false;
        }
        // Responsáveis (multi) — considera responsibleId + assignees
        if (effectiveResponsibles.length > 0) {
          const ids = new Set<string>();
          if (activity.responsibleId) ids.add(activity.responsibleId);
          for (const a of activity.assignees) ids.add(a.id);
          if (!effectiveResponsibles.some((id) => ids.has(id))) return false;
        }
        // Prazo
        if (!prazoMatches(activity, prazoFilter, today)) return false;
      } else {
        if (statusFilter.length > 0 && !statusFilter.includes(activity.status)) {
          return false;
        }
        if (problemFilter === "none") {
          if (activity.problemId) return false;
        } else if (problemFilter && activity.problemId !== problemFilter) {
          return false;
        }
        if (branchFilter === "canal-geral") {
          if (activity.branchId !== null) return false;
        } else if (branchFilter && activity.branchId !== branchFilter) {
          return false;
        }
        if (
          responsibleFilter &&
          activity.responsibleId !== responsibleFilter &&
          !activity.assignees.some(
            (assignee) => assignee.id === responsibleFilter
          )
        ) {
          return false;
        }
      }

      // Categoria (ambos)
      if (
        categoryFilter.length > 0 &&
        (!activity.category || !categoryFilter.includes(activity.category))
      ) {
        return false;
      }

      return true;
    });
  }, [
    data,
    search,
    isGlobal,
    today,
    bucketFilter,
    onlyMine,
    currentUserId,
    channelFilter,
    responsibleMulti,
    prazoFilter,
    statusFilter,
    problemFilter,
    branchFilter,
    responsibleFilter,
    categoryFilter,
  ]);

  // Contadores dos StatCards refletem o dataset bruto (ignoram os outros
  // filtros) — assim eles funcionam como quick-lens do débito real.
  const bucketCounts = React.useMemo(() => {
    const counts = { atrasada: 0, semana: 0, proximas: 0, concluida: 0 };
    for (const activity of data) {
      const b = bucketOf(activity, today);
      if (b in counts) counts[b as keyof typeof counts] += 1;
    }
    return counts;
  }, [data, today]);

  // Seções temporais (visão global). Consomem `filtered` — respeita
  // tudo que os filtros já cortaram. Concluídas só aparece se o card
  // Concluídas estiver ativo (StatCard controla a visibilidade dela).
  const sections = React.useMemo(() => {
    if (!isGlobal) return [];
    const grouped: Record<SectionId, ActivityRow[]> = {
      atrasadas: [],
      "esta-semana": [],
      "proximas-2-semanas": [],
      depois: [],
      "sem-prazo": [],
      concluidas: [],
    };
    for (const activity of filtered) {
      grouped[sectionOf(activity, today)].push(activity);
    }
    for (const id of SECTION_ORDER) {
      grouped[id] = sortActivities(grouped[id], sortMode);
    }
    return SECTION_ORDER.map((id) => ({
      id,
      label: SECTION_LABELS[id],
      activities: grouped[id],
    })).filter((section) => section.activities.length > 0);
  }, [isGlobal, filtered, today, sortMode]);

  function handleRegister(activity: ActivityRow) {
    openWizard({ mode: "registrar", activityId: activity.id });
  }

  const columns = React.useMemo<ColumnDef<ActivityRow>[]>(() => {
    const cols: ColumnDef<ActivityRow>[] = [
      {
        id: "title",
        accessorKey: "title",
        enableSorting: false,
        header: "Atividade",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <CategoryIconBox
              category={row.original.category}
              size="md"
              withTooltip
              className="self-center"
            />
            <div className="min-w-0 max-w-72">
              <span className="block truncate font-medium">
                {row.original.title}
              </span>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.branchName ?? "Canal geral"}
              </p>
            </div>
          </div>
        ),
      },
    ];

    if (showChannel) {
      cols.push({
        id: "channel",
        accessorKey: "channelName",
        enableSorting: false,
        header: "Canal",
        cell: ({ row }) => (
          <Link
            href={`/canais/${row.original.channelId}`}
            onClick={(event) => event.stopPropagation()}
            className="whitespace-nowrap text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {row.original.channelName}
          </Link>
        ),
      });
    }

    cols.push(
      {
        id: "problem",
        accessorKey: "problemTitle",
        enableSorting: false,
        header: "Meta",
        cell: ({ row }) => {
          const pending =
            !row.original.problemId && row.original.status === "concluida";
          const badge = row.original.problemTitle ? (
            <span className="block max-w-48">
              <TruncatedText text={row.original.problemTitle} />
            </span>
          ) : pending ? (
            <Badge
              variant="outline"
              className="border-transparent bg-warning-bg text-warning-fg"
            >
              <TriangleAlert aria-hidden="true" />
              Vincular meta
            </Badge>
          ) : (
            <span className="italic text-muted-foreground">Sem vínculo</span>
          );

          if (canEdit && onEdit) {
            return (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(row.original);
                }}
                className="cursor-pointer rounded-md text-left underline-offset-4 hover:opacity-80"
                aria-label="Editar meta vinculada"
                title="Editar meta vinculada"
              >
                {badge}
              </button>
            );
          }
          return badge;
        },
      },
      {
        id: "responsible",
        accessorKey: "responsibleName",
        enableSorting: false,
        header: "Responsável",
        cell: ({ row }) => {
          const assignees = row.original.assignees;
          if (assignees.length === 0) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          if (assignees.length === 1) {
            return (
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(assignees[0].name)}
                  </AvatarFallback>
                </Avatar>
                <span className="whitespace-nowrap text-sm">
                  {assignees[0].name}
                </span>
              </div>
            );
          }
          return (
            <AvatarGroup
              title={assignees.map((assignee) => assignee.name).join(", ")}
            >
              {assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.id} className="size-6">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(assignee.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 3 ? (
                <AvatarGroupCount className="size-6 text-[10px]">
                  +{assignees.length - 3}
                </AvatarGroupCount>
              ) : null}
            </AvatarGroup>
          );
        },
      },
      {
        id: "dueDate",
        accessorKey: "dueDate",
        header: ({ column }) => <SortHeader label="Prazo" column={column} />,
        sortingFn: (a, b) => {
          const dateA = a.original.dueDate ?? "9999-12-31";
          const dateB = b.original.dueDate ?? "9999-12-31";
          return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
        },
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <DeadlineText
              dueDate={row.original.dueDate}
              status={row.original.status}
              format="date"
            />
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => <SortHeader label="Status" column={column} />,
        sortingFn: (a, b) =>
          STATUS_SORT_ORDER[a.original.status] -
          STATUS_SORT_ORDER[b.original.status],
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      }
    );

    return cols;
  }, [showChannel, canEdit, onEdit]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
  });

  function clearFilters() {
    setSearch("");
    setCategoryFilter([]);
    if (isGlobal) {
      setBucketFilter(null);
      setOnlyMine(false);
      setChannelFilter([]);
      setResponsibleMulti([]);
      setPrazoFilter("todos");
      setSortMode("prazo-asc");
      setSectionOpen(DEFAULT_OPEN);
    } else {
      setStatusFilter([]);
      setProblemFilter(null);
      setBranchFilter(null);
      setResponsibleFilter(null);
    }
  }

  const problemOptions: SelectOption[] = [
    { value: "none", label: "Sem meta vinculada" },
    ...problems,
  ];

  return (
    <div className="flex flex-col gap-3">
      {isGlobal ? (
        <>
          {/* KPIs — comportam como radio (um por vez); clicar no ativo
           *  desliga. Concluídas fica rebaixado; a lista sempre mostra
           *  todas as seções, com Concluídas/Canceladas embaixo. */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              label="Atrasadas"
              value={bucketCounts.atrasada}
              hint="vencidas ainda abertas"
              valueTone={bucketCounts.atrasada > 0 ? "warning" : "default"}
              active={bucketFilter === "atrasada"}
              onClick={() => toggleBucket("atrasada")}
            />
            <KpiCard
              label="Esta semana"
              value={bucketCounts.semana}
              hint="vencem em até 7 dias"
              active={bucketFilter === "semana"}
              onClick={() => toggleBucket("semana")}
            />
            <KpiCard
              label="Próximas"
              value={bucketCounts.proximas}
              hint="de 8 a 30 dias"
              active={bucketFilter === "proximas"}
              onClick={() => toggleBucket("proximas")}
            />
            <KpiCard
              label="Concluídas"
              value={bucketCounts.concluida}
              hint="na safra"
              valueTone="muted"
              active={bucketFilter === "concluida"}
              onClick={() => toggleBucket("concluida")}
            />
          </div>

          {/* Linha de controle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar atividade..."
                className="pl-9"
                aria-label="Buscar atividade por título"
              />
            </div>

            {currentUserId ? (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 shrink-0 gap-1.5",
                  onlyMine
                    ? "border-primary/40 bg-subtle text-foreground"
                    : "text-muted-foreground"
                )}
                aria-pressed={onlyMine}
                onClick={() => setOnlyMine((current) => !current)}
              >
                {onlyMine ? <Check className="size-3" /> : null}
                Só minhas
              </Button>
            ) : null}

            {channels.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <MultiFilterButton
                      label="Canal"
                      count={channelFilter.length}
                    />
                  }
                />
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Filtrar por canal</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <div className="max-h-72 overflow-y-auto">
                    {channels.map((channel) => (
                      <DropdownMenuCheckboxItem
                        key={channel.value}
                        checked={channelFilter.includes(channel.value)}
                        onCheckedChange={(checked) =>
                          setChannelFilter((current) =>
                            checked
                              ? [...current, channel.value]
                              : current.filter((id) => id !== channel.value)
                          )
                        }
                        closeOnClick={false}
                      >
                        {channel.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <MultiFilterButton
                    label="Tipo de ação"
                    count={categoryFilter.length}
                  />
                }
              />
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {ACTIVITY_CATEGORIES.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={categoryFilter.includes(category)}
                    onCheckedChange={(checked) =>
                      setCategoryFilter((current) =>
                        checked
                          ? [...current, category]
                          : current.filter((item) => item !== category)
                      )
                    }
                    closeOnClick={false}
                  >
                    {CATEGORY_LABELS[category]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <MultiFilterButton
                    label="Responsável"
                    count={responsibleMulti.length}
                  />
                }
              />
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Filtrar por responsável</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="max-h-72 overflow-y-auto">
                  {responsibles.map((responsible) => (
                    <DropdownMenuCheckboxItem
                      key={responsible.value}
                      checked={responsibleMulti.includes(responsible.value)}
                      onCheckedChange={(checked) =>
                        setResponsibleMulti((current) =>
                          checked
                            ? [...current, responsible.value]
                            : current.filter((id) => id !== responsible.value)
                        )
                      }
                      closeOnClick={false}
                    >
                      {responsible.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9">
                    <CalendarRange />
                    Prazo
                    {prazoFilter !== "todos" ? (
                      <Badge variant="secondary" className="tabular-nums">
                        1
                      </Badge>
                    ) : null}
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuRadioGroup
                  value={prazoFilter}
                  onValueChange={(value) => setPrazoFilter(value as PrazoFilter)}
                >
                  <DropdownMenuLabel>Filtrar por prazo</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PRAZO_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1 sm:max-w-64">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar atividade..."
              className="pl-9"
              aria-label="Buscar atividade por título"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <MultiFilterButton
                  label="Status"
                  count={statusFilter.length}
                />
              }
            />
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {ACTIVITY_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={(checked) =>
                    setStatusFilter((current) =>
                      checked
                        ? [...current, status]
                        : current.filter((item) => item !== status)
                    )
                  }
                  closeOnClick={false}
                >
                  {STATUS_LABELS[status]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <MultiFilterButton
                  label="Categoria"
                  count={categoryFilter.length}
                />
              }
            />
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filtrar por categoria</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {ACTIVITY_CATEGORIES.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={categoryFilter.includes(category)}
                  onCheckedChange={(checked) =>
                    setCategoryFilter((current) =>
                      checked
                        ? [...current, category]
                        : current.filter((item) => item !== category)
                    )
                  }
                  closeOnClick={false}
                >
                  {CATEGORY_LABELS[category]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <SearchableSelect
            options={problemOptions}
            value={problemFilter}
            onValueChange={setProblemFilter}
            placeholder="Meta"
            className="w-44"
          />
          <SearchableSelect
            options={branches}
            value={branchFilter}
            onValueChange={setBranchFilter}
            placeholder="Filial"
            className="w-40"
          />
          <SearchableSelect
            options={responsibles}
            value={responsibleFilter}
            onValueChange={setResponsibleFilter}
            placeholder="Responsável"
            className="w-44"
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground tabular-nums sm:inline">
              {filtered.length} de {data.length}{" "}
              {data.length === 1 ? "atividade" : "atividades"}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9">
                    <Settings2 />
                    <span className="hidden sm:inline">Colunas</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Exibir colunas</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(checked) =>
                        column.toggleVisibility(!!checked)
                      }
                      closeOnClick={false}
                    >
                      {COLUMN_LABELS[column.id] ?? column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {canEdit && onCreate ? (
              <Button
                variant="brand"
                size="sm"
                className="h-9"
                onClick={onCreate}
              >
                <Plus />
                Nova atividade
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {isGlobal ? (
        <GlobalList
          sections={sections}
          totalCount={data.length}
          filteredCount={filtered.length}
          hasFilters={hasFilters}
          sectionOpen={sectionOpen}
          toggleSection={toggleSection}
          sortMode={sortMode}
          setSortMode={setSortMode}
          onOpen={(activity) => openActivity(activity.id)}
          onRegister={handleRegister}
          onClearFilters={clearFilters}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-card">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>
                {hasFilters
                  ? "Nenhum resultado com esses filtros"
                  : "Nenhuma atividade no plano"}
              </EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? "Ajuste ou limpe os filtros para ver as atividades."
                  : "Crie a primeira atividade para colocar o plano em movimento."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : canEdit && onCreate ? (
                <Button variant="brand" onClick={onCreate}>
                  <Plus />
                  Nova atividade
                </Button>
              ) : null}
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-border [&>th]:h-auto [&>th]:py-3 [&>th]:text-xs [&>th]:font-medium [&>th]:tracking-wide [&>th]:text-muted-foreground [&>th]:uppercase"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => openActivity(row.original.id)}
                    className="group cursor-pointer border-border/50 transition-colors hover:bg-hover-surface [&>td]:py-3.5"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground tabular-nums">
              Página {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Próxima
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── KpiCard: card compacto do topo da lista global ─────────────────────
// Sem ícone decorativo, altura alvo ~96px, cor do valor com hierarquia
// (âmbar só em Atrasadas, muted em Concluídas — histórico).
function KpiCard({
  label,
  value,
  hint,
  valueTone = "default",
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  valueTone?: "default" | "warning" | "muted";
  active: boolean;
  onClick: () => void;
}) {
  const valueClass =
    valueTone === "warning"
      ? "text-warning"
      : valueTone === "muted"
        ? "text-muted-foreground"
        : "text-foreground";

  return (
    <Card
      className={cn(
        "gap-0 p-0 transition-[background-color,border-color,box-shadow] duration-base ease-standard",
        active
          ? "border-primary/40 bg-subtle shadow-elevated! ring-1 ring-accent-brand/20"
          : "border-border bg-card hover:border-border-hover hover:shadow-elevated!"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className="block w-full cursor-pointer px-5 py-4 text-left"
      >
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
            valueClass
          )}
        >
          {value}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </button>
    </Card>
  );
}

// ── GlobalList: cabeçalho de contador + sort + seções colapsáveis ─────
type Section = { id: SectionId; label: string; activities: ActivityRow[] };

function GlobalList({
  sections,
  totalCount,
  filteredCount,
  hasFilters,
  sectionOpen,
  toggleSection,
  sortMode,
  setSortMode,
  onOpen,
  onRegister,
  onClearFilters,
}: {
  sections: Section[];
  totalCount: number;
  filteredCount: number;
  hasFilters: boolean;
  sectionOpen: Record<SectionId, boolean>;
  toggleSection: (id: SectionId) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  onOpen: (activity: ActivityRow) => void;
  onRegister: (activity: ActivityRow) => void;
  onClearFilters: () => void;
}) {
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sortMode)?.label ??
    "Ordenar";

  const isEmpty = filteredCount === 0 || sections.length === 0;
  const totalWord = totalCount === 1 ? "atividade" : "atividades";

  return (
    <div className="flex flex-col gap-3">
      {/* Header da lista */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{filteredCount}</span>{" "}
          de {totalCount} {totalWord}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                <ArrowDownWideNarrow className="size-4" />
                <span className="hidden sm:inline">{sortLabel}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuRadioGroup
              value={sortMode}
              onValueChange={(value) => setSortMode(value as SortMode)}
            >
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border bg-card shadow-card">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>
                {hasFilters
                  ? "Nada encontrado com esses filtros"
                  : "Nenhuma atividade na safra"}
              </EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? "Ajuste ou limpe os filtros para ver as atividades."
                  : "As atividades dos seus canais aparecerão aqui assim que forem criadas."}
              </EmptyDescription>
            </EmptyHeader>
            {hasFilters ? (
              <EmptyContent>
                <Button variant="outline" onClick={onClearFilters}>
                  Limpar filtros
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <SectionGroup
              key={section.id}
              section={section}
              open={sectionOpen[section.id]}
              onToggle={() => toggleSection(section.id)}
              onOpenActivity={onOpen}
              onRegister={onRegister}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionGroup({
  section,
  open,
  onToggle,
  onOpenActivity,
  onRegister,
}: {
  section: Section;
  open: boolean;
  onToggle: () => void;
  onOpenActivity: (activity: ActivityRow) => void;
  onRegister: (activity: ActivityRow) => void;
}) {
  const isAtrasadas = section.id === "atrasadas";
  const count = section.activities.length;

  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="group/section flex w-full cursor-pointer items-center gap-2 py-2 text-left transition-colors"
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-base",
                open ? "rotate-0" : "-rotate-90"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium transition-colors group-hover/section:text-foreground",
                isAtrasadas ? "text-warning" : "text-foreground"
              )}
            >
              {section.label}
            </span>
            <span
              className={cn(
                "text-xs tabular-nums",
                isAtrasadas ? "text-warning/80" : "text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        }
      />
      <CollapsibleContent>
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          {section.activities.map((activity) => (
            <ActivityRowItem
              key={activity.id}
              activity={{
                id: activity.id,
                title: activity.title,
                status: activity.status,
                category: activity.category,
                dueDate: activity.dueDate,
                channelName: activity.channelName,
                branchName: activity.branchName,
                problemTitle: activity.problemTitle,
                assignees: activity.assignees,
              }}
              onOpen={() => onOpenActivity(activity)}
              onRegister={() => onRegister(activity)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
