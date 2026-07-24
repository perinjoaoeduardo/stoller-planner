"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Camera } from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";

import { type ActivityStatus, OPEN_STATUSES, StatusBadge } from "@/components/shared/status-badge";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import { formatRelativeDue } from "@/lib/plan-utils";
import { cn, getInitials } from "@/lib/utils";

export type ActivityCardData = {
  id: string;
  title: string;
  status: ActivityStatus;
  category: ActivityCategory | null;
  dueDate: string | null;
  completedAt?: string | null;
  branchName: string | null;
  channelName?: string | null;
  assignees: { id: string; name: string }[];
};


/** Texto do prazo: relativo nas abertas, data de conclusão nas feitas. */
function dueLine(activity: ActivityCardData): string {
  if (activity.status === "concluida" && activity.completedAt) {
    return `concluída em ${format(parseISO(activity.completedAt), "dd MMM", {
      locale: ptBR,
    })}`;
  }
  if (OPEN_STATUSES.includes(activity.status)) {
    const text = formatRelativeDue(activity.dueDate);
    return text === "Sem prazo" ? "sem prazo" : text;
  }
  return activity.dueDate
    ? format(parseISO(activity.dueDate), "dd MMM yyyy", { locale: ptBR })
    : "sem prazo";
}

/**
 * Card rico de atividade do RTV (visão do canal e Minhas Atividades):
 * título, Local + Tipo de ação, responsáveis + prazo relativo, status e
 * ação "Registrar" (deep link, Situação A). O card inteiro navega para
 * o detalhe da atividade; concluídas ficam sutilmente apagadas.
 */
export function ActivityCard({
  activity,
  showCanal = false,
  className,
}: {
  activity: ActivityCardData;
  /** Mostra o nome do canal na linha 2 (listas que misturam canais). */
  showCanal?: boolean;
  className?: string;
}) {
  const { openActivity } = useActivityDrawer();
  const open = OPEN_STATUSES.includes(activity.status);
  const late = activity.status === "atrasada";
  const completed = activity.status === "concluida";

  const metaParts = [
    showCanal ? activity.channelName : null,
    activity.branchName,
    activity.category ? CATEGORY_LABELS[activity.category] : null,
  ].filter((part): part is string => !!part);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-muted/40",
        completed && "opacity-75",
        className
      )}
    >
      <button
        type="button"
        onClick={() => openActivity(activity.id)}
        className="absolute inset-0 rounded-xl"
        aria-label={activity.title}
      />

      {/* Linha 1 — título */}
      <p className="line-clamp-2 leading-snug font-medium">{activity.title}</p>

      {/* Linha 2 — Local · Tipo de ação (some se não há nada) */}
      {metaParts.length > 0 ? (
        <p className="truncate text-sm text-muted-foreground">
          {metaParts.join(" · ")}
        </p>
      ) : null}

      {/* Linha 3 — responsáveis + prazo */}
      <div className="flex min-h-6 items-center justify-between gap-2">
        {activity.assignees.length > 0 ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="relative z-10 flex w-fit items-center" />
              }
            >
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
            </TooltipTrigger>
            <TooltipContent>
              {activity.assignees.map((assignee) => assignee.name).join(", ")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">
            Sem responsável
          </span>
        )}
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            late
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          )}
        >
          {dueLine(activity)}
        </span>
      </div>

      {/* Linha 4 — status + ação */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={activity.status} />
        {open ? (
          <Button
            variant="secondary"
            size="sm"
            className="relative z-10 h-11 shrink-0 px-3 sm:h-9"
            nativeButton={false}
            render={
              <Link
                href={`/registrar?atividade=${activity.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                <Camera />
                Registrar
              </Link>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
