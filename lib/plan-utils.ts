import type { ActivityStatus } from "@/components/app/status-badge";

/**
 * Regras puras do plano, compartilhadas entre servidor e client
 * (sem dependências de next/headers).
 */

export type ChannelHealth = "em_dia" | "atencao" | "critico";

export const HEALTH_CONFIG: Record<
  ChannelHealth,
  { label: string; dotClass: string }
> = {
  em_dia: { label: "Em dia", dotClass: "bg-emerald-500" },
  atencao: { label: "Atenção", dotClass: "bg-amber-500" },
  critico: { label: "Crítico", dotClass: "bg-red-500" },
};

const PENDING_STATUSES: ActivityStatus[] = ["planejada", "em_andamento"];

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Uma atividade conta como "atrasada" quando o status é `atrasada` OU
 * quando ainda está pendente (planejada/em andamento) com prazo vencido.
 */
export function isLateActivity(activity: {
  status: ActivityStatus;
  dueDate: string | null;
}): boolean {
  if (activity.status === "atrasada") return true;
  if (!PENDING_STATUSES.includes(activity.status)) return false;
  if (!activity.dueDate) return false;
  return activity.dueDate < todayISO();
}

/** Verde ≤10% atrasadas, âmbar 10–30%, vermelho >30%. */
export function computeHealth(lateCount: number, total: number): ChannelHealth {
  if (total === 0) return "em_dia";
  const ratio = lateCount / total;
  if (ratio <= 0.1) return "em_dia";
  if (ratio <= 0.3) return "atencao";
  return "critico";
}
