import type { ActivityStatus } from "@/components/shared/status-badge";
import {
  deadlineClass,
  formatDeadline,
  type DeadlineFormat,
} from "@/lib/deadline";
import { cn } from "@/lib/utils";

/**
 * Texto de prazo canônico — a cor segue a lógica única de lib/deadline
 * (alarme único: encerradas nunca alarmam; vermelho só aberta+vencida).
 */
export function DeadlineText({
  dueDate,
  status,
  format = "date",
  className,
}: {
  dueDate: string | null;
  status: ActivityStatus;
  format?: DeadlineFormat;
  className?: string;
}) {
  const text = formatDeadline(dueDate, format);
  if (!text) {
    return (
      <span className={cn("italic text-muted-foreground", className)}>
        Sem prazo
      </span>
    );
  }
  return (
    <span
      className={cn("tabular-nums", deadlineClass(dueDate, status), className)}
    >
      {text}
    </span>
  );
}
