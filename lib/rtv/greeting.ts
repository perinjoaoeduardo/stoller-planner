/**
 * Textos da saudação da home do RTV — funções puras, sem dependência de
 * dados do servidor, para serem testáveis e reutilizáveis.
 */

/** "Bom dia" / "Boa tarde" / "Boa noite" conforme a hora (0–23). */
export function greetingByHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export type GreetingContextInput = {
  /** Atividades abertas com status derivado "atrasada". */
  lateCount: number;
  /** Abertas (não atrasadas) que vencem nos próximos 7 dias. */
  dueThisWeekCount: number;
  /** Abertas no total (planejada, em andamento, atrasada). */
  openCount: number;
  /** Concluídas na safra. */
  completedCount: number;
  /** Total de atividades da safra no escopo do usuário. */
  totalCount: number;
};

/**
 * Escolhe UMA linha de contexto para a home do RTV, por prioridade:
 * atrasadas → vencendo na semana → tudo em dia → sem atividades.
 * Nunca retorna string vazia.
 */
export function greetingContextLine(input: GreetingContextInput): string {
  if (input.lateCount > 0) {
    return input.lateCount === 1
      ? "1 atividade precisa de atenção"
      : `${input.lateCount} atividades precisam de atenção`;
  }
  if (input.dueThisWeekCount > 0) {
    return input.dueThisWeekCount === 1
      ? "1 atividade vence esta semana"
      : `${input.dueThisWeekCount} atividades vencem esta semana`;
  }
  if (input.totalCount > 0) {
    return `Tudo em dia — ${input.completedCount} de ${input.totalCount} atividades concluídas nesta safra`;
  }
  return "Nenhuma atividade atribuída ainda — você pode registrar ações pelo botão abaixo";
}
