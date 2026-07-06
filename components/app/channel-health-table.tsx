"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Store } from "lucide-react";

import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import type { ChannelHealthRow } from "@/lib/db/cx";
import {
  formatDaysAgo,
  HEALTH_CONFIG,
  type ChannelHealth,
} from "@/lib/plan-utils";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${
    parts.length > 1 ? parts[parts.length - 1][0] : ""
  }`.toUpperCase();
}

/** "há 3 dias" / "há 26 dias" (vermelho > limite) / "Nunca". */
function LastExecutionCell({ row }: { row: ChannelHealthRow }) {
  const overLimit =
    row.daysSinceExecution === null ||
    row.daysSinceExecution > DARK_CHANNEL_DAYS;
  return (
    <span
      className={cn(
        "whitespace-nowrap text-sm tabular-nums",
        overLimit
          ? "font-medium text-red-600 dark:text-red-400"
          : "text-muted-foreground"
      )}
    >
      {formatDaysAgo(row.daysSinceExecution)}
    </span>
  );
}

const HEALTH_ORDER: Record<ChannelHealth, number> = {
  critico: 0,
  atencao: 1,
  em_dia: 2,
};

/**
 * Tabela "Saúde por canal" da visão CX — REUSADA no painel /visao-geral
 * e em /regioes/[id]. Ordenação default: piores primeiro (sem registro
 * há mais tempo). Linha clicável → /canais/[id].
 */
export function ChannelHealthTable({
  data,
  regions,
  dsms,
}: {
  data: ChannelHealthRow[];
  /** Omitido/vazio esconde o filtro de região (página da região). */
  regions?: SelectOption[];
  dsms: SelectOption[];
}) {
  const router = useRouter();
  const [regionFilter, setRegionFilter] = React.useState<string | null>(null);
  const [healthFilter, setHealthFilter] = React.useState<string | null>(null);
  const [dsmFilter, setDsmFilter] = React.useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "lastExecution", desc: true },
  ]);

  const filtered = React.useMemo(
    () =>
      data.filter((row) => {
        if (regionFilter && row.regionId !== regionFilter) return false;
        if (healthFilter && row.health !== healthFilter) return false;
        if (dsmFilter && row.dsmId !== dsmFilter) return false;
        return true;
      }),
    [data, regionFilter, healthFilter, dsmFilter]
  );

  const columns = React.useMemo<ColumnDef<ChannelHealthRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Canal",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/canais/${row.original.id}`}
            className="block max-w-52 truncate font-medium underline-offset-4 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "region",
        accessorKey: "regionName",
        header: "Região",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {row.original.regionName.replace(/^Regional\s+/i, "")}
          </span>
        ),
      },
      {
        id: "dsm",
        accessorKey: "dsmName",
        header: "DSM",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.dsmName ? (
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarFallback className="text-[10px]">
                  {getInitials(row.original.dsmName)}
                </AvatarFallback>
              </Avatar>
              <span className="whitespace-nowrap text-sm">
                {row.original.dsmName}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: "activities",
        accessorKey: "activityCount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Atividades
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.activityCount}
          </span>
        ),
      },
      {
        id: "completed",
        accessorKey: "completedPercent",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            % concluídas
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex min-w-28 items-center gap-2">
            <Progress
              value={row.original.completedPercent}
              className="w-16 [&_[data-slot=progress-track]]:h-1.5"
              aria-label={`${row.original.completedPercent}% concluídas`}
            />
            <span className="text-sm tabular-nums">
              {row.original.completedPercent}%
            </span>
          </div>
        ),
      },
      {
        id: "late",
        accessorKey: "lateCount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Atrasadas
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "text-sm tabular-nums",
              row.original.lateCount > 0
                ? "font-medium text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            {row.original.lateCount}
          </span>
        ),
      },
      {
        id: "lastExecution",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Último registro
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        // desc = sem registro há mais tempo primeiro ("nunca" no topo)
        sortingFn: (a, b) =>
          (a.original.daysSinceExecution ?? Number.POSITIVE_INFINITY) ===
          (b.original.daysSinceExecution ?? Number.POSITIVE_INFINITY)
            ? 0
            : (a.original.daysSinceExecution ?? Number.POSITIVE_INFINITY) <
                (b.original.daysSinceExecution ?? Number.POSITIVE_INFINITY)
              ? -1
              : 1,
        cell: ({ row }) => <LastExecutionCell row={row.original} />,
      },
      {
        id: "health",
        accessorKey: "health",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Saúde
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        sortingFn: (a, b) =>
          HEALTH_ORDER[a.original.health] - HEALTH_ORDER[b.original.health],
        cell: ({ row }) => {
          const health = HEALTH_CONFIG[row.original.health];
          return (
            <span className="flex items-center gap-2 whitespace-nowrap text-sm">
              <span
                aria-hidden
                className={cn("size-2 rounded-full", health.dotClass)}
              />
              {health.label}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const healthOptions: SelectOption[] = (
    Object.keys(HEALTH_CONFIG) as ChannelHealth[]
  ).map((health) => ({ value: health, label: HEALTH_CONFIG[health].label }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {regions && regions.length > 0 ? (
          <SearchableSelect
            options={regions}
            value={regionFilter}
            onValueChange={setRegionFilter}
            placeholder="Todas as regiões"
            className="w-44"
          />
        ) : null}
        <SearchableSelect
          options={healthOptions}
          value={healthFilter}
          onValueChange={setHealthFilter}
          placeholder="Toda saúde"
          className="w-36"
        />
        <SearchableSelect
          options={dsms}
          value={dsmFilter}
          onValueChange={setDsmFilter}
          placeholder="Todos os DSMs"
          className="w-44"
        />
      </div>

      {filtered.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle>Nenhum canal encontrado</EmptyTitle>
            <EmptyDescription>
              Nenhum canal corresponde aos filtros atuais. Limpe os filtros
              para ver todos.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(
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
                  className="cursor-pointer"
                  onClick={() => router.push(`/canais/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
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
      )}
    </div>
  );
}
