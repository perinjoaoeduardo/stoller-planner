"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Camera,
  MoreHorizontal,
} from "lucide-react";

import { CategoryIconBox } from "@/components/shared/icon-box";
import { DeadlineText } from "@/components/shared/deadline-text";
import { type ActivityStatus, OPEN_STATUSES, StatusBadge } from "@/components/shared/status-badge";
import { TruncatedText } from "@/components/shared/truncated-text";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActivityCategory } from "@/lib/config";
import type { DeadlineFormat } from "@/lib/deadline";
import { cn, getInitials } from "@/lib/utils";

export type ActivityTableRow = {
  id: string;
  title: string;
  category: ActivityCategory | null;
  status: ActivityStatus;
  dueDate: string | null;
  branchName?: string | null;
  channelName?: string | null;
  problemTitle?: string | null;
  assignees?: { id: string; name: string }[];
};

export type ActivityTableColumn =
  | "atividade"
  | "meta"
  | "responsaveis"
  | "prazo"
  | "status"
  | "acao";

const OPEN_SET = new Set<ActivityStatus>(OPEN_STATUSES);

type SortKey = "prazo" | "status";

/**
 * Tabela de atividades ÚNICA do app (home, Minhas Atividades, Visão do
 * Canal) — colunas configuráveis, regras visuais únicas: headers
 * uppercase só aqui, divisórias sutis, hover de row, prazo via
 * lib/deadline, status via StatusBadge, "Sem vínculo"/local genérico
 * em itálico muted. Filtros, ordenação e paginação ficam nas telas.
 */
export function ActivityTable({
  activities,
  columns,
  onRowClick,
  rowAction = "menu",
  onRegister,
  deadlineFormat = "date",
  showChannel = false,
  sort,
}: {
  activities: ActivityTableRow[];
  columns: ActivityTableColumn[];
  onRowClick: (activity: ActivityTableRow) => void;
  rowAction?: "registrar" | "menu";
  onRegister?: (activity: ActivityTableRow) => void;
  deadlineFormat?: DeadlineFormat;
  /** Mostra "Canal · Filial" na 2ª linha (listas que misturam canais,
   *  ex.: home do RTV). Sem isso, mostra só a filial / "Canal geral". */
  showChannel?: boolean;
  sort?: {
    key: SortKey;
    dir: "asc" | "desc";
    onToggle: (key: SortKey) => void;
  };
}) {
  function SortIcon({ column }: { column: SortKey }) {
    if (!sort || sort.key !== column) {
      return (
        <ArrowUpDown className="ml-1 inline size-3.5 text-muted-foreground" />
      );
    }
    return sort.dir === "asc" ? (
      <ArrowUp className="ml-1 inline size-3.5 text-muted-foreground" />
    ) : (
      <ArrowDown className="ml-1 inline size-3.5 text-muted-foreground" />
    );
  }

  function head(column: ActivityTableColumn) {
    switch (column) {
      case "atividade":
        return <TableHead key={column}>Atividade</TableHead>;
      case "meta":
        return (
          <TableHead key={column} className="hidden xl:table-cell">
            Meta
          </TableHead>
        );
      case "responsaveis":
        return (
          <TableHead key={column} className="hidden lg:table-cell">
            Responsáveis
          </TableHead>
        );
      case "prazo":
      case "status": {
        const label = column === "prazo" ? "Prazo" : "Status";
        if (!sort) return <TableHead key={column}>{label}</TableHead>;
        return (
          <TableHead key={column}>
            <button
              type="button"
              onClick={() => sort.onToggle(column)}
              className="flex cursor-pointer items-center uppercase hover:text-foreground"
            >
              {label}
              <SortIcon column={column} />
            </button>
          </TableHead>
        );
      }
      case "acao":
        return (
          <TableHead key={column} className="text-right">
            Ação
          </TableHead>
        );
    }
  }

  function cell(column: ActivityTableColumn, activity: ActivityTableRow) {
    const open = OPEN_SET.has(activity.status);
    switch (column) {
      case "atividade":
        return (
          <TableCell key={column} className="max-w-72">
            <div className="flex items-center gap-3">
              <CategoryIconBox
                category={activity.category}
                size="md"
                withTooltip
                className="self-center"
              />
              <div className="min-w-0">
                <TruncatedText text={activity.title} className="font-medium" />
                <p className="truncate text-xs text-muted-foreground">
                  {showChannel && activity.channelName ? (
                    <>
                      {activity.channelName}
                      {activity.branchName ? ` · ${activity.branchName}` : ""}
                    </>
                  ) : (
                    activity.branchName ?? (
                      <span className="italic">Canal geral</span>
                    )
                  )}
                </p>
              </div>
            </div>
          </TableCell>
        );
      case "meta":
        return (
          <TableCell key={column} className="hidden max-w-48 xl:table-cell">
            {activity.problemTitle ? (
              <TruncatedText text={activity.problemTitle} />
            ) : (
              <span className="italic text-muted-foreground">Sem vínculo</span>
            )}
          </TableCell>
        );
      case "responsaveis": {
        const assignees = activity.assignees ?? [];
        return (
          <TableCell key={column} className="hidden lg:table-cell">
            {assignees.length > 0 ? (
              <Tooltip>
                <TooltipTrigger
                  render={<span className="flex w-fit -space-x-2" />}
                >
                  {assignees.slice(0, 3).map((assignee) => (
                    <Avatar
                      key={assignee.id}
                      className="size-7 border-2 border-card"
                    >
                      <AvatarFallback className="text-xs font-medium text-foreground">
                        {getInitials(assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {assignees.length > 3 ? (
                    <Avatar className="size-7 border-2 border-card">
                      <AvatarFallback className="text-[10px] font-medium text-muted-foreground">
                        +{assignees.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                </TooltipTrigger>
                <TooltipContent>
                  {assignees.map((assignee) => assignee.name).join(", ")}
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
        );
      }
      case "prazo":
        return (
          <TableCell key={column} className="whitespace-nowrap">
            <DeadlineText
              dueDate={activity.dueDate}
              status={activity.status}
              format={deadlineFormat}
            />
          </TableCell>
        );
      case "status":
        return (
          <TableCell key={column}>
            <StatusBadge status={activity.status} />
          </TableCell>
        );
      case "acao":
        return (
          <TableCell key={column} className="text-right">
            <div
              onClick={(event) => event.stopPropagation()}
              className="flex justify-end"
            >
              {rowAction === "registrar" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2.5 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                  onClick={() => onRegister?.(activity)}
                >
                  <Camera />
                  Registrar
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ações"
                        className={cn(
                          "text-muted-foreground group-hover:text-foreground",
                          !open && "opacity-40"
                        )}
                      >
                        <MoreHorizontal />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={!open}
                      onClick={() => onRegister?.(activity)}
                    >
                      <Camera />
                      Registrar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </TableCell>
        );
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border [&>th]:h-auto [&>th]:py-3 [&>th]:text-xs [&>th]:font-medium [&>th]:tracking-wide [&>th]:text-muted-foreground [&>th]:uppercase">
          {columns.map((column) => head(column))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity) => (
          <TableRow
            key={activity.id}
            className="group cursor-pointer border-border/50 transition-colors hover:bg-hover-surface [&>td]:py-3.5"
            onClick={() => onRowClick(activity)}
          >
            {columns.map((column) => cell(column, activity))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
