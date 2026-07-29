import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Tempo relativo COMPACTO em português: "agora", "há 40 min", "há 3 h",
 * "ontem", "há 4 dias" e, a partir de uma semana, a data curta
 * ("10 abr 2026").
 *
 * Estava inline na Timeline do Activity Panel usando
 * `formatDistanceToNow`, que produz "há cerca de 3 horas" — verborrágico
 * numa linha de metadado, onde o leitor quer a ordem de grandeza e não a
 * precisão. Virou função quando a Caixa de entrada passou a precisar do
 * mesmo texto: duas formatações de data no app são dois jeitos de ler a
 * mesma informação.
 *
 * A partir de uma semana o relativo perde utilidade ("há 23 dias" não
 * situa ninguém) e a data curta situa — mesma data curta do resto do
 * app, sem extenso.
 */
export function relativeFromNow(iso: string): string {
  const date = parseISO(iso);
  const minutos = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = differenceInCalendarDays(new Date(), date);
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;

  return format(date, "dd MMM yyyy", { locale: ptBR });
}
