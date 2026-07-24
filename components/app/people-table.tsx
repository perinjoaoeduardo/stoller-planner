"use client";

import * as React from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Users } from "lucide-react";

import { CopySummaryMenu } from "@/components/app/copy-summary-menu";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/lib/auth/nav";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import type { PersonRow } from "@/lib/db/cx";
import { formatDaysAgo } from "@/lib/plan-utils";
import { cn, getInitials } from "@/lib/utils";

const ROLE_OPTIONS: SelectOption[] = [
  { value: "DSM", label: "DSM" },
  { value: "RTV", label: "RTV" },
];

/**
 * Tab "Pessoas" do /acompanhamento: quem está atualizando e quem sumiu.
 * Sort default: último registro mais antigo primeiro (nunca no topo).
 */
export function PeopleTable({
  data,
  regions,
}: {
  data: PersonRow[];
  regions: SelectOption[];
}) {
  const [roleFilter, setRoleFilter] = React.useState<string | null>(null);
  const [regionFilter, setRegionFilter] = React.useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "lastExecution", desc: true },
  ]);

  const filtered = React.useMemo(
    () =>
      data.filter((row) => {
        if (roleFilter && row.role !== roleFilter) return false;
        if (regionFilter && !row.regionIds.includes(regionFilter)) return false;
        return true;
      }),
    [data, roleFilter, regionFilter]
  );

  const columns = React.useMemo<ColumnDef<PersonRow>[]>(
    () => [
      {
        id: "person",
        accessorKey: "name",
        header: "Pessoa",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarFallback className="text-[10px]">
                {getInitials(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <Link
              href={`/pessoas/${row.original.id}`}
              className="whitespace-nowrap text-sm font-medium underline-offset-4 hover:underline"
            >
              {row.original.name}
            </Link>
            <Badge variant="outline" className="text-[10px]">
              {row.original.role as Role}
            </Badge>
          </div>
        ),
      },
      {
        id: "links",
        accessorKey: "linksLabel",
        header: "Vínculos",
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="block max-w-64 truncate text-sm text-muted-foreground"
            title={row.original.linksLabel}
          >
            {row.original.linksLabel}
          </span>
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
                ? "font-medium text-warning"
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
        // desc = mais antigo primeiro ("nunca" no topo)
        sortingFn: (a, b) =>
          (a.original.daysSinceExecution ?? Number.POSITIVE_INFINITY) ===
          (b.original.daysSinceExecution ?? Number.POSITIVE_INFINITY)
            ? 0
            : (a.original.daysSinceExecution ?? Number.POSITIVE_INFINITY) <
                (b.original.daysSinceExecution ?? Number.POSITIVE_INFINITY)
              ? -1
              : 1,
        cell: ({ row }) => {
          const overLimit =
            row.original.daysSinceExecution === null ||
            row.original.daysSinceExecution > DARK_CHANNEL_DAYS;
          return (
            <span
              className={cn(
                "whitespace-nowrap text-sm tabular-nums",
                overLimit
                  ? "font-medium text-warning"
                  : "text-muted-foreground"
              )}
            >
              {row.original.daysSinceExecution === null
                ? "Nunca registrou"
                : formatDaysAgo(row.original.daysSinceExecution)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <CopySummaryMenu
              summaryText={row.original.summaryText}
              profileHref={`/pessoas/${row.original.id}`}
            />
          </div>
        ),
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchableSelect
          options={ROLE_OPTIONS}
          value={roleFilter}
          onValueChange={setRoleFilter}
          placeholder="Todos os perfis"
          className="w-40"
        />
        <SearchableSelect
          options={regions}
          value={regionFilter}
          onValueChange={setRegionFilter}
          placeholder="Todas as regiões"
          className="w-44"
        />
      </div>

      {filtered.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Ninguém encontrado</EmptyTitle>
            <EmptyDescription>
              Nenhuma pessoa corresponde aos filtros atuais.
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
                <TableRow key={row.id}>
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
