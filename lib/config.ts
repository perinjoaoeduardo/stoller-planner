/**
 * Parâmetros de negócio do protótipo, em um só lugar.
 */

/**
 * Canal "no escuro": sem NENHUM registro de execução (activity_events
 * do tipo execucao_registrada) há mais de este número de dias — ou que
 * nunca registrou execução na safra. Usado no painel CX, na tabela de
 * saúde por canal e no acompanhamento.
 */
export const DARK_CHANNEL_DAYS = 21;

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
