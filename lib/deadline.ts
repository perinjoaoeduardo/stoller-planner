import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { ActivityStatus } from "@/components/shared/status-badge";
import { formatRelativeDue } from "@/lib/plan-utils";

/**
 * LÓGICA CANÔNICA do prazo (Constituição — existe em UM arquivo só).
 * Alarme único: badge OU texto, nunca os dois. Uma atividade vencida já
 * mostra o badge "Atrasada" em âmbar ao lado — então a DATA não repete o
 * alarme (não fica vermelha); só fica legível em foreground. Vermelho é
 * exclusivo de ação destrutiva/erro, nunca de prazo.
 * - concluída/não feita: neutro (encerrada)
 * - aberta e vencida: foreground legível (o badge âmbar carrega o alarme)
 * - aberta, vence em 0-7 dias: âmbar (único sinal — o badge é "Planejada")
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
  if (days < 0) return "text-foreground";
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
