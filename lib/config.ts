/**
 * Parâmetros de negócio do protótipo, em um só lugar.
 *
 * Regra da casa: número que um dev/PM pode querer ajustar NÃO vive
 * hardcoded em tela — vive aqui (exceções por domínio: lib/photos.ts
 * concentra os limites de foto). Ver README → "Onde configurar o quê".
 */

/**
 * Safra corrente do protótipo. Fallback de exibição quando o plano do
 * canal não traz `harvest` — o valor real vem do banco (plans.harvest).
 */
export const CURRENT_HARVEST = "2025/26";

/** "2025/26" | "Safra 2025/26" | null → "Safra 2025/26". */
export function harvestLabel(harvest?: string | null): string {
  const h = harvest || CURRENT_HARVEST;
  return h.startsWith("Safra") ? h : `Safra ${h}`;
}

/**
 * Canal "no escuro": sem NENHUM registro de execução (activity_events
 * do tipo execucao_registrada) há mais de este número de dias — ou que
 * nunca registrou execução na safra. Usado no painel CX, na tabela de
 * saúde por canal e no acompanhamento.
 */
export const DARK_CHANNEL_DAYS = 21;

/**
 * Atraso "crítico" na home do DSM: atividade aberta vencida há mais de
 * este número de dias entra no card "Precisa de atenção".
 */
export const CRITICAL_OVERDUE_DAYS = 30;

/** Paginação padrão das listas densas (Minhas Atividades, canal, tabelas). */
export const DEFAULT_PAGE_SIZE = 20;

/** Mural de notas do canal. */
export const NOTES_MAX_PINNED = 5;
export const NOTES_MAX_BODY = 5000;

/** Descrição de atividade/registro (wizard e formulários do /registrar). */
export const MAX_DESCRIPTION = 500;

/** Home do RTV: quantas "minhas atividades" aparecem antes do "ver todas". */
export const MAX_MY_ACTIVITIES = 5;

/** Calendário: itens visíveis por dia antes do "+N mais" (mês e semana). */
export const CALENDAR_MAX_PILLS = 3;
export const CALENDAR_MAX_WEEK_CARDS = 3;

/** Busca global (Ctrl+K): quantos itens recentes ficam salvos. */
export const SEARCH_MAX_RECENTS = 5;

/**
 * Categorias de atividade — FIXAS (decisão de produto), não editáveis
 * por usuário. Único ponto de verdade: banco (CHECK), formulários,
 * badges e relatórios leem daqui.
 */
export const ACTIVITY_CATEGORIES = [
  "reuniao_gerente",
  "treinamento",
  "rodada_canal",
  "geracao_demanda",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  reuniao_gerente: "Reunião de resultado com gerente",
  treinamento: "Treinamento e capacitação",
  rodada_canal: "Rodada com o canal",
  geracao_demanda: "Geração de demanda",
};
