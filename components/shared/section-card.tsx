/**
 * Card de SEÇÃO que se desmancha no celular.
 *
 * O problema: numa tela de 375px, uma seção com moldura (borda + fundo +
 * 24px de respiro) contendo uma lista de itens que TAMBÉM têm moldura vira
 * caixa dentro de caixa. Custa ~64px dos 375 só em bordas e respiro
 * repetido, e o olho tem de decidir duas vezes onde começa cada coisa.
 *
 * A moldura de fora existe para agrupar — e no celular o agrupamento já é
 * dado pela largura da tela: não há nada ao lado de que separar. Então ela
 * some, e sobra o que importa: um título e a lista embaixo dele. Do `sm:`
 * para cima, onde as seções voltam a dividir a linha, a moldura volta.
 *
 * Uso: `<Card className={cn(FLAT_ON_MOBILE, ...)}>`. Vale para o Card e
 * seus filhos diretos (CardHeader / CardContent / CardFooter), que é onde
 * o padding horizontal mora.
 */
export const FLAT_ON_MOBILE =
  "max-sm:gap-3 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none max-sm:[&>*]:px-0";
