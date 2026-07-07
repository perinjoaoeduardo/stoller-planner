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
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryBadge } from "@/components/app/category-badge";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import {
  ACTIVITY_STATUSES,
  STATUS_LABELS,
  StatusBadge,
  type ActivityStatus,
} from "@/components/app/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
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
import { deleteActivity } from "@/lib/actions/plan";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/config";
import type { ActivityRow } from "@/lib/db/channels";
import { cn } from "@/lib/utils";

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

function isOverdue(activity: ActivityRow) {
  return (
    !!activity.dueDate &&
    activity.status !== "concluida" &&
    activity.status !== "nao_feita" &&
    activity.dueDate < TODAY_ISO()
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${
    parts.length > 1 ? parts[parts.length - 1][0] : ""
  }`.toUpperCase();
}

const STATUS_SORT_ORDER: Record<ActivityStatus, number> = {
  atrasada: 0,
  em_andamento: 1,
  planejada: 2,
  concluida: 3,
  nao_feita: 4,
};

const COLUMN_LABELS: Record<string, string> = {
  title: "Atividade",
  category: "Categoria",
  channel: "Canal",
  problem: "Problema",
  responsible: "Responsável",
  dueDate: "Prazo",
  status: "Status",
};

/**
 * DataTable de atividades — a tela mais usada do produto.
 * Busca, filtros combinados, sort, paginação (20/página), toggle de
 * colunas e ações por linha (quando o usuário pode editar o plano).
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
}: {
  data: ActivityRow[];
  problems: SelectOption[];
  branches: SelectOption[];
  responsibles: SelectOption[];
  canEdit: boolean;
  showChannel?: boolean;
  onCreate?: () => void;
  onEdit?: (activity: ActivityRow) => void;
}) {
  // Filtros iniciais via URL (?q=, ?status=, ?filial=, ?responsavel=)
  // para deep links da busca global e compartilhamento de visões.
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(
    () => searchParams.get("q") ?? ""
  );
  const [statusFilter, setStatusFilter] = React.useState<ActivityStatus[]>(
    () =>
      (searchParams.get("status") ?? "")
        .split(",")
        .filter((value): value is ActivityStatus =>
          (ACTIVITY_STATUSES as string[]).includes(value)
        )
  );
  const [categoryFilter, setCategoryFilter] = React.useState<
    ActivityCategory[]
  >(() =>
    (searchParams.get("categoria") ?? "")
      .split(",")
      .filter((value): value is ActivityCategory =>
        (ACTIVITY_CATEGORIES as readonly string[]).includes(value)
      )
  );
  const [problemFilter, setProblemFilter] = React.useState<string | null>(null);
  const [branchFilter, setBranchFilter] = React.useState<string | null>(
    () => searchParams.get("filial")
  );
  const [responsibleFilter, setResponsibleFilter] = React.useState<
    string | null
  >(() => searchParams.get("responsavel"));
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [deleting, setDeleting] = React.useState<ActivityRow | null>(null);

  const hasFilters =
    search.trim() !== "" ||
    statusFilter.length > 0 ||
    categoryFilter.length > 0 ||
    !!problemFilter ||
    !!branchFilter ||
    !!responsibleFilter;

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((activity) => {
      if (term && !activity.title.toLowerCase().includes(term)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(activity.status)) {
        return false;
      }
      if (
        categoryFilter.length > 0 &&
        (!activity.category || !categoryFilter.includes(activity.category))
      ) {
        return false;
      }
      if (problemFilter === "none") {
        if (activity.problemId) return false;
      } else if (problemFilter && activity.problemId !== problemFilter) {
        return false;
      }
      if (branchFilter && activity.branchId !== branchFilter) return false;
      if (
        responsibleFilter &&
        activity.responsibleId !== responsibleFilter &&
        !activity.assignees.some(
          (assignee) => assignee.id === responsibleFilter
        )
      ) {
        return false;
      }
      return true;
    });
  }, [
    data,
    search,
    statusFilter,
    categoryFilter,
    problemFilter,
    branchFilter,
    responsibleFilter,
  ]);

  const columns = React.useMemo<ColumnDef<ActivityRow>[]>(() => {
    const cols: ColumnDef<ActivityRow>[] = [
      {
        id: "title",
        accessorKey: "title",
        enableSorting: false,
        header: "Atividade",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-72">
            <Link
              href={`/atividades/${row.original.id}`}
              className="block truncate font-medium underline-offset-4 hover:underline"
            >
              {row.original.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.branchName ?? "Sem filial"}
            </p>
          </div>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        enableSorting: false,
        header: "Categoria",
        cell: ({ row }) =>
          row.original.category ? (
            <CategoryBadge category={row.original.category} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
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
        header: "Problema",
        cell: ({ row }) => {
          // Pendência do "vincular depois": concluída sem problema.
          const pending =
            !row.original.problemId && row.original.status === "concluida";
          const badge = row.original.problemTitle ? (
            <Badge variant="outline" className="max-w-48">
              <span className="truncate">{row.original.problemTitle}</span>
            </Badge>
          ) : pending ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              <TriangleAlert aria-hidden="true" />
              Vincular problema
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-dashed text-muted-foreground"
            >
              Sem vínculo
            </Badge>
          );

          // Edição trivial: um clique no vínculo abre o Sheet de edição.
          if (canEdit && onEdit) {
            return (
              <button
                type="button"
                onClick={() => onEdit(row.original)}
                className="cursor-pointer rounded-md text-left underline-offset-4 hover:opacity-80"
                aria-label="Editar problema vinculado"
                title="Editar problema vinculado"
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
          // Um responsável: avatar + nome. Vários: AvatarGroup (máx 3 +
          // contador), nomes completos no title.
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
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Prazo
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        sortingFn: (a, b) => {
          const dateA = a.original.dueDate ?? "9999-12-31";
          const dateB = b.original.dueDate ?? "9999-12-31";
          return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
        },
        cell: ({ row }) => (
          <span
            className={cn(
              "whitespace-nowrap text-sm tabular-nums",
              isOverdue(row.original) && "font-medium text-red-600 dark:text-red-400"
            )}
          >
            {row.original.dueDate
              ? format(parseISO(row.original.dueDate), "dd MMM yyyy", {
                  locale: ptBR,
                })
              : "—"}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        sortingFn: (a, b) =>
          STATUS_SORT_ORDER[a.original.status] -
          STATUS_SORT_ORDER[b.original.status],
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal />
                  <span className="sr-only">Ações da atividade</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                render={<Link href={`/atividades/${row.original.id}`} />}
              >
                <Eye />
                Ver detalhes
              </DropdownMenuItem>
              {canEdit && onEdit ? (
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
                  <Pencil />
                  Editar
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleting(row.original)}
                  >
                    <Trash2 />
                    Excluir
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
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
    initialState: { pagination: { pageSize: 20 } },
  });

  function clearFilters() {
    setSearch("");
    setStatusFilter([]);
    setCategoryFilter([]);
    setProblemFilter(null);
    setBranchFilter(null);
    setResponsibleFilter(null);
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteActivity({ activityId: deleting.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Atividade excluída do plano.");
    setDeleting(null);
  }

  const problemOptions: SelectOption[] = [
    { value: "none", label: "Sem problema vinculado" },
    ...problems,
  ];

  return (
    <div className="flex flex-col gap-3">
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
              <Button variant="outline" size="sm" className="h-9">
                <ListFilter />
                Status
                {statusFilter.length > 0 ? (
                  <Badge variant="secondary" className="tabular-nums">
                    {statusFilter.length}
                  </Badge>
                ) : null}
              </Button>
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
              <Button variant="outline" size="sm" className="h-9">
                <ListFilter />
                Categoria
                {categoryFilter.length > 0 ? (
                  <Badge variant="secondary" className="tabular-nums">
                    {categoryFilter.length}
                  </Badge>
                ) : null}
              </Button>
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
          placeholder="Problema"
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
            <Button size="sm" className="h-9" onClick={onCreate}>
              <Plus />
              Nova atividade
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted-foreground tabular-nums">
        {filtered.length} de {data.length}{" "}
        {data.length === 1 ? "atividade" : "atividades"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border">
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
                <Button onClick={onCreate}>
                  <Plus />
                  Nova atividade
                </Button>
              ) : null}
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
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
                  <TableRow key={row.id}>
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

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.photoCount > 0
                ? `"${deleting.title}" tem ${deleting.photoCount} ${
                    deleting.photoCount === 1 ? "foto anexada" : "fotos anexadas"
                  } que também ${
                    deleting.photoCount === 1 ? "será excluída" : "serão excluídas"
                  }. Essa ação não pode ser desfeita.`
                : `"${deleting?.title}" será removida do plano. Essa ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Excluir atividade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
