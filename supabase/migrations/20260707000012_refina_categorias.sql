-- Refinamento do backfill de categorias: casos claros que o fallback
-- da migration anterior deixou em rodada_canal.

-- Educação da equipe/balcão → treinamento
update public.activities
set category = 'treinamento'
where category = 'rodada_canal'
  and title ~* 'workshop|palestra|onboarding';

-- Ações comerciais de estímulo à venda → geração de demanda
update public.activities
set category = 'geracao_demanda'
where category = 'rodada_canal'
  and title ~* 'queima de estoque|barter|farm show|estande|gôndola|material impresso|pacote comercial';

-- Fóruns de gestão e planejamento → reunião de resultado com gerente
update public.activities
set category = 'reuniao_gerente'
where category = 'rodada_canal'
  and title ~* 'encontro anual|comitê|revisão trimestral';
