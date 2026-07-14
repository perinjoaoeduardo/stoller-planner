import { differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Regras puras do plano, compartilhadas entre servidor e client
 * (sem dependências de next/headers).
 *
 * A regra de status derivado/atraso vive em /lib/db/status.ts
 * (getDisplayStatus / isLateActivity) — única implementação.
 */

export type ChannelHealth = "em_dia" | "atencao" | "critico";

export const HEALTH_CONFIG: Record<
  ChannelHealth,
  { label: string; dotClass: string }
> = {
  em_dia: { label: "Em dia", dotClass: "bg-success" },
  atencao: { label: "Atenção", dotClass: "bg-warning" },
  critico: { label: "Crítico", dotClass: "bg-destructive" },
};

/**
 * Prazo relativo em português para os cards de campo:
 * "vence hoje", "vence em 3 dias", "venceu há 2 dias", "Sem prazo".
 */
export function formatRelativeDue(dueDate: string | null): string {
  if (!dueDate) return "Sem prazo";
  const diff = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (diff === 0) return "vence hoje";
  if (diff === 1) return "vence amanhã";
  if (diff > 1) return `vence em ${diff} dias`;
  if (diff === -1) return "venceu ontem";
  return `venceu há ${-diff} dias`;
}

/**
 * "hoje" / "há 1 dia" / "há 26 dias" / "Nunca" — usado nas colunas de
 * último registro de execução da visão CX (null = nunca registrou).
 */
export function formatDaysAgo(days: number | null): string {
  if (days === null) return "Nunca";
  if (days === 0) return "hoje";
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/** Verde ≤10% atrasadas, âmbar 10–30%, vermelho >30%. */
export function computeHealth(lateCount: number, total: number): ChannelHealth {
  if (total === 0) return "em_dia";
  const ratio = lateCount / total;
  if (ratio <= 0.1) return "em_dia";
  if (ratio <= 0.3) return "atencao";
  return "critico";
}
