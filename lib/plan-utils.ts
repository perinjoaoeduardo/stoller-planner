import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Regras puras do plano, compartilhadas entre servidor e client
 * (sem dependências de next/headers).
 *
 * A regra de status derivado/atraso vive em /lib/db/status.ts
 * (getDisplayStatus / isLateActivity) — única implementação.
 */

export type ChannelHealth = "em_dia" | "atencao" | "critico";

// Saúde não é semáforo de 3 cores: âmbar sinaliza "precisa de olhar"
// (atenção/crítico), em dia é neutro. Verde fica reservado a conclusão
// e vermelho a prazo vencido — a severidade vem do rótulo, não da cor.
export const HEALTH_CONFIG: Record<
  ChannelHealth,
  { label: string; dotClass: string }
> = {
  em_dia: { label: "Em dia", dotClass: "bg-muted-foreground/40" },
  atencao: { label: "Atenção", dotClass: "bg-warning" },
  critico: { label: "Crítico", dotClass: "bg-warning" },
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
/** "12 jul 2026" (ou com hora) — formatador ptBR canônico das telas. */
export function formatDate(value: string | null, withTime = false): string {
  if (!value) return "—";
  return format(
    parseISO(value),
    withTime ? "dd MMM yyyy 'às' HH:mm" : "dd MMM yyyy",
    { locale: ptBR }
  );
}

/** "jul 26" — rótulo curto de mês para heatmaps e eixos. */
export function formatMonthShort(isoMonth: string): string {
  return format(parseISO(`${isoMonth}-01`), "MMM yy", { locale: ptBR }).replace(
    ".",
    ""
  );
}

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
