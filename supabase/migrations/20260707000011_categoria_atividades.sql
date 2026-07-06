-- Categoria da atividade: 4 valores fixos (fonte de verdade dos rótulos
-- em lib/config.ts). Nullable no banco para não quebrar linhas antigas,
-- mas a APLICAÇÃO trata como obrigatória em toda criação/edição.

alter table public.activities
  add column category text
  check (
    category in (
      'reuniao_gerente',
      'treinamento',
      'rodada_canal',
      'geracao_demanda'
    )
  );

create index activities_category_idx on public.activities (category);

-- ─── Backfill versionado por padrões do título ──────────────────────────────
-- A ordem importa: padrões mais específicos primeiro. Só preenche NULL,
-- então rodar de novo não sobrescreve nada.

-- Treinamento e capacitação
update public.activities
set category = 'treinamento'
where category is null
  and title ~* 'treinament|capacita|reciclagem';

-- Geração de demanda (campo, demonstração, campanhas, lançamentos)
update public.activities
set category = 'geracao_demanda'
where category is null
  and title ~* 'dia de campo|demonstra|campanha|geração de demanda|lançamento|ensaio';

-- Reunião de resultado com gerente (gestão, metas, alinhamento, análise)
update public.activities
set category = 'reuniao_gerente'
where category is null
  and title ~* 'reuni|resultado|alinhament|meta|gerência|diretoria|análise|previs|defini';

-- Rodada com o canal (visitas, rotas, acompanhamento, positivação)
update public.activities
set category = 'rodada_canal'
where category is null
  and title ~* 'visita|rodada|acompanhament|positiva|rota|roteiriza';

-- O que sobrou é trabalho de campo junto ao canal.
update public.activities
set category = 'rodada_canal'
where category is null;
