import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { ActivityStatus } from "@/components/shared/status-badge";
import { formatRelativeDue } from "@/lib/plan-utils";

/**
 * LÓGICA CANÔNICA do prazo (Constituição, item 7: existe em UM arquivo
 * só — já regrediu uma vez quando estava duplicada):
 * - concluída/não feita: SEMPRE neutro, a atividade já foi encerrada
 * - aberta e vencida: vermelho (único uso de destructive fora do asterisco)
 * - aberta, vence em 0-7 dias: âmbar de atenção
 * - aberta, 8+ dias ou sem prazo: neutro
 */
export function deadlineClass(
  dueDate: string | null,
  status: ActivityStatus
): string {
  if (status === "concluida" || status === "nao_feita") {
    return "text-muted-foreground";
  }
  if (!dueDate) return "text-muted-foreground";
  const days = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (days < 0) return "font-medium text-destructive";
  if (days <= 7) return "text-warning";
  return "text-muted-foreground";
}

export type DeadlineFormat = "date" | "relative";

/** "10 abr 2026" (date) ou "vence em 6 dias" / "venceu há 87 dias" (relative). */
export function formatDeadline(
  dueDate: string | null,
  fmt: DeadlineFormat
): string | null {
  if (!dueDate) return null;
  return fmt === "date"
    ? format(parseISO(dueDate), "dd MMM yyyy", { locale: ptBR })
    : formatRelativeDue(dueDate);
}
