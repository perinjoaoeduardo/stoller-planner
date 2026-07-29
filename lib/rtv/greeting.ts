/**
 * Textos da saudação das homes — funções puras, sem dependência de
 * dados do servidor, para serem testáveis e reutilizáveis.
 */

/** "Bom dia" / "Boa tarde" / "Boa noite" conforme a hora (0–23). */
export function greetingByHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Hora atual em São Paulo (0–23). Fica aqui, junto de quem consome, para
 * as três homes (RTV, DSM, CX) saudarem no mesmo fuso — o servidor pode
 * estar em UTC e "Boa noite" às 15h seria um bug silencioso.
 */
export function currentHourInSaoPaulo(): number {
  return Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date())
  );
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
  return "Nenhuma atividade atribuída ainda — você pode registrar atividades pelo botão abaixo";
}
