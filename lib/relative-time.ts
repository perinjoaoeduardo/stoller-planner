import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Tempo relativo em português ("há 13 horas", "há 3 dias").
 *
 * Estava inline na Timeline do Activity Panel e em mais alguns pontos.
 * Virou função porque a Caixa de entrada passou a precisar do MESMO
 * texto: duas formatações de data no app significa duas maneiras de o
 * usuário ler a mesma informação.
 */
export function relativeFromNow(iso: string): string {
  return formatDistanceToNow(parseISO(iso), {
    locale: ptBR,
    addSuffix: true,
  });
}
