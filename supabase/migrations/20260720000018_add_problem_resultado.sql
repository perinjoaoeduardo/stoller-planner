-- Resultado da meta ao fim da safra (frase curta, escrita pelo DSM/RTV).
-- Ate agora o Relatorio de Safra tinha o campo no TIPO (ReportProblem.resultado)
-- mas nao na tabela, entao o bloco "Resultado" nunca preenchia e mostrava
-- sempre "Resultado nao informado". Esta coluna e a origem do dado.

alter table public.problems
  add column if not exists resultado text;

comment on column public.problems.resultado is
  'Resultado da meta ao fim da safra — frase curta exibida como protagonista no Relatorio de Safra.';
