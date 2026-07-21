"use client";

import { Camera, ChevronRight } from "lucide-react";

import { CategoryIconBox } from "@/components/shared/icon-box";
import { DeadlineText } from "@/components/shared/deadline-text";
import {
  STATUS_LABELS,
  type ActivityStatus,
} from "@/components/shared/status-badge";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type ActivityCategory } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Linha canônica de atividade — usada na visão global agrupada
 * (/atividades). Agrupa status + categoria à esquerda em um só bloco
 * (a bolinha de status ancora no canto do IconBox), remove o header
 * de tabela e alinha tudo por flex com larguras fixas nos blocos
 * direitos. Em mobile os blocos secundários empilham dentro do bloco
 * de identidade.
 */

export type ActivityRowData = {
  id: string;
  title: string;
  status: ActivityStatus;
  category: ActivityCategory | null;
  dueDate: string | null;
  channelName: string;
  branchName: string | null;
  problemTitle: string | null;
  assignees: { id: string; name: string }[];
};

// Regra canônica das cores da bolinha (Constituição, item 2):
// âmbar = atraso, verde = concluído, resto é neutro. NUNCA vermelho.
const STATUS_DOT: Record<ActivityStatus, string> = {
  planejada: "bg-muted-foreground/70",
  concluida: "bg-success",
  atrasada: "bg-warning",
  nao_feita: "bg-muted-foreground/40",
};

const OPEN_STATUSES = new Set<ActivityStatus>(["planejada", "atrasada"]);

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${
    parts.length > 1 ? parts[parts.length - 1][0] : ""
  }`.toUpperCase();
}

export function ActivityRow({
  activity,
  onOpen,
  onRegister,
  className,
}: {
  activity: ActivityRowData;
  /** Clique na linha inteira: abre o painel da atividade. */
  onOpen: (activity: ActivityRowData) => void;
  /** Ação rápida "Registrar" — só renderiza se passada e status aberto. */
  onRegister?: (activity: ActivityRowData) => void;
  className?: string;
}) {
  const open = OPEN_STATUSES.has(activity.status);
  const assignees = activity.assignees;
  const primaryAssigneeName = assignees[0]?.name ?? null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(activity)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(activity);
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-2 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-hover-surface focus:outline-none focus-visible:bg-hover-surface md:flex-row md:items-center md:gap-4",
        className
      )}
    >
      {/* Status + categoria — bolinha ancorada no canto do IconBox
       *  com ring do fundo do card para separar visualmente. */}
      <div className="relative shrink-0 self-start">
        <CategoryIconBox
          category={activity.category}
          size="md"
          withTooltip
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                aria-hidden
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                  STATUS_DOT[activity.status]
                )}
              />
            }
          />
          <TooltipContent>{STATUS_LABELS[activity.status]}</TooltipContent>
        </Tooltip>
        <span className="sr-only">Status: {STATUS_LABELS[activity.status]}</span>
      </div>

      {/* Identidade */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">
          {activity.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <span>{activity.channelName}</span>
          {activity.branchName ? (
            <>
              <span> · </span>
              <span>{activity.branchName}</span>
            </>
          ) : null}
          <span> · </span>
          {activity.problemTitle ? (
            <span>{activity.problemTitle}</span>
          ) : (
            <span className="italic text-muted-foreground/70">Sem meta</span>
          )}
        </p>

        {/* Mobile: responsável + prazo empilham dentro do bloco de
         *  identidade (a bolinha e o chevron não vão junto). */}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground md:hidden">
          {assignees.length > 0 && primaryAssigneeName ? (
            <span className="flex items-center gap-1.5">
              <Avatar className="size-5">
                <AvatarFallback className="text-[9px]">
                  {getInitials(primaryAssigneeName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{primaryAssigneeName}</span>
            </span>
          ) : (
            <span className="italic">Sem responsável</span>
          )}
          <span aria-hidden>·</span>
          <DeadlineText
            dueDate={activity.dueDate}
            status={activity.status}
            format="date"
            className="text-xs"
          />
        </div>
      </div>

      {/* Responsável (desktop) — max 2 avatares + "+N", nome do primeiro
       *  ao lado, "Sem responsável" italic. */}
      <div className="hidden w-44 shrink-0 items-center gap-2 md:flex">
        {assignees.length === 0 || !primaryAssigneeName ? (
          <span className="text-sm italic text-muted-foreground">
            Sem responsável
          </span>
        ) : (
          <>
            <div className="flex shrink-0 -space-x-2">
              <Avatar className="size-6 ring-2 ring-card">
                <AvatarFallback className="text-[10px]">
                  {getInitials(primaryAssigneeName)}
                </AvatarFallback>
              </Avatar>
              {assignees.length === 2 ? (
                <Avatar className="size-6 ring-2 ring-card">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(assignees[1].name)}
                  </AvatarFallback>
                </Avatar>
              ) : assignees.length > 2 ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Avatar className="size-6 ring-2 ring-card">
                        <AvatarFallback className="text-[10px] font-medium text-muted-foreground">
                          +{assignees.length - 1}
                        </AvatarFallback>
                      </Avatar>
                    }
                  />
                  <TooltipContent>
                    {assignees.map((a) => a.name).join(", ")}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            <span className="truncate text-sm text-foreground">
              {primaryAssigneeName}
            </span>
          </>
        )}
      </div>

      {/* Prazo (desktop) */}
      <div className="hidden w-28 shrink-0 text-right text-sm md:block">
        <DeadlineText
          dueDate={activity.dueDate}
          status={activity.status}
          format="date"
        />
      </div>

      {/* Ação rápida — só em status abertos */}
      <div className="hidden w-28 shrink-0 justify-end md:flex">
        {open && onRegister ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onRegister(activity);
            }}
          >
            <Camera />
            Registrar
          </Button>
        ) : null}
      </div>

      <ChevronRight className="hidden w-6 shrink-0 text-muted-foreground/60 md:block" />
    </div>
  );
}
