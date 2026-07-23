import type { ActivityStatus } from "@/components/shared/status-badge";
import type { ActivityCategory } from "@/lib/config";
import type { ResponsibleOption } from "@/lib/db/channels";

/**
 * Tipos compartilhados entre server actions e componentes client.
 * Moram aqui — e não dentro dos arquivos "use server" — para um
 * componente poder importar o tipo sem depender da camada de mutação.
 */

/** Retorno padrão de toda mutação (server action). */
export type ActionResult = { ok: true } | { ok: false; error: string };

// ── Wizard (agendar / registrar) ─────────────────────────────────────

export type WizardActivity = {
  id: string;
  title: string;
  status: ActivityStatus;
  category: ActivityCategory | null;
  description: string | null;
  dueDate: string | null;
  branchId: string | null;
  branchName: string | null;
  channelId: string;
  channelName: string;
  problemTitle: string | null;
  assigneeCount: number;
  isMine: boolean;
};

export type WizardChannelContext = {
  planId: string | null;
  branches: { id: string; name: string }[];
  problems: { id: string; title: string }[];
  responsibles: ResponsibleOption[];
  openActivities: WizardActivity[];
};

export type ScheduleActivityInput = {
  channelId: string;
  title: string;
  category: ActivityCategory;
  description?: string;
  problemId?: string | null;
  branchId?: string | null;
  assigneeIds: string[];
  dueDate: string;
};

export type ScheduleResult =
  | { ok: true; activityId: string }
  | { ok: false; error: string };

// ── Registrar execução ───────────────────────────────────────────────

export type RegisterExecutionInput = {
  /** Atividade existente do plano (Situação A: abrir e concluir). */
  activityId?: string;
  /** Registro avulso (Situação B): filial onde a ação aconteceu. */
  adhocBranchId?: string;
  /** Registro avulso sem filial específica ("Canal geral"). */
  adhocChannelId?: string;
  /**
   * O que foi feito. Obrigatória no avulso; opcional na atividade
   * planejada (o plano já descreve) — se vier diferente, atualiza a
   * descrição da atividade.
   */
  description: string;
  /** Categoria do registro avulso (obrigatória na Situação B). */
  category?: ActivityCategory;
  /** Problema do plano no registro avulso; null = "vincular depois". */
  problemId?: string | null;
  /** Marcar a atividade como concluída ao registrar. */
  markCompleted: boolean;
  /** Caminhos no bucket activity-photos, já enviados pelo client. */
  photoPaths: string[];
};

export type RegisterExecutionResult =
  | { ok: true; activityId: string; completed: boolean }
  | { ok: false; error: string };
