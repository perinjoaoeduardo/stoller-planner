import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Camera } from "lucide-react";

import { StatusBadge, type ActivityStatus } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelativeDue } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";

export type FieldActivityCardData = {
  id: string;
  title: string;
  status: ActivityStatus;
  dueDate: string | null;
  branchName: string | null;
  channelName: string;
};

const OPEN_STATUSES: ActivityStatus[] = [
  "planejada",
  "em_andamento",
  "atrasada",
];

/**
 * Card de atividade do RTV em campo (Minhas Atividades e home):
 * mobile-first, alvo de toque generoso, prazo relativo em português e
 * ação rápida "Registrar" que abre o fluxo já com a atividade escolhida.
 */
export function FieldActivityCard({
  activity,
  showRegister = true,
  className,
}: {
  activity: FieldActivityCardData;
  showRegister?: boolean;
  className?: string;
}) {
  const open = OPEN_STATUSES.includes(activity.status);
  const late = activity.status === "atrasada";

  return (
    <div
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-muted/40",
        className
      )}
    >
      <Link
        href={`/atividades/${activity.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={activity.title}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 leading-snug font-medium">
          {activity.title}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {activity.branchName ?? "Sem filial"} · {activity.channelName}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <StatusBadge status={activity.status} />
          <span
            className={cn(
              "text-xs tabular-nums",
              late
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            )}
          >
            {open
              ? formatRelativeDue(activity.dueDate)
              : activity.dueDate
                ? format(parseISO(activity.dueDate), "dd MMM yyyy", {
                    locale: ptBR,
                  })
                : "Sem prazo"}
          </span>
        </div>
      </div>
      {showRegister && open ? (
        <Button
          variant="secondary"
          size="sm"
          className="relative z-10 h-11 shrink-0 self-center px-3"
          nativeButton={false}
          render={
            <Link href={`/registrar?atividade=${activity.id}`}>
              <Camera />
              Registrar
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
