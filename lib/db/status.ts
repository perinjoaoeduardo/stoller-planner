import type { ActivityStatus } from "@/components/shared/status-badge";

/**
 * FONTE ÚNICA DO STATUS EXIBIDO
 * =============================
 * O banco guarda o status "cru" da atividade; a regra de atraso é
 * derivada aqui, em código, para o protótipo: toda atividade pendente
 * (planejada/em andamento) com prazo vencido é EXIBIDA como atrasada em
 * todas as telas, sem job de banco.
 *
 * Em produção isso pode virar uma coluna computada no Postgres ou um
 * cron diário que materializa o status — a regra continua sendo esta.
 *
 * Regra de ouro: NENHUMA tela lê `activity.status` cru do banco.
 * A camada de dados (lib/db/*) já converte com getDisplayStatus antes
 * de entregar para os componentes.
 */

export type ActivityForStatus = {
  /** Status cru do banco (string) — pode conter o legado "em_andamento". */
  status: string;
  dueDate: string | null;
};

/** Data de hoje em ISO (yyyy-mm-dd), para comparação com due_date. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Status canônico para EXIBIÇÃO e ÚNICO ponto de normalização:
 * - "em_andamento" foi removido do sistema — qualquer linha legada é
 *   tratada como "planejada" aqui (robusto mesmo antes da migração).
 * - planejada com prazo vencido vira "atrasada".
 * - os demais passam direto.
 */
export function getDisplayStatus(activity: ActivityForStatus): ActivityStatus {
  const status: ActivityStatus =
    activity.status === "em_andamento"
      ? "planejada"
      : (activity.status as ActivityStatus);

  if (
    status === "planejada" &&
    activity.dueDate !== null &&
    activity.dueDate < todayISO()
  ) {
    return "atrasada";
  }
  return status;
}

/** Atalho: a atividade conta como atrasada (status cru ou derivado)? */
export function isLateActivity(activity: ActivityForStatus): boolean {
  return getDisplayStatus(activity) === "atrasada";
}
