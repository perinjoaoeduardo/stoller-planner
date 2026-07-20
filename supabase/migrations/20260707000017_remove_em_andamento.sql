-- Remove o status "em_andamento" das atividades.
-- Decisão de produto (jul/2026): manter algo "em andamento" é difícil na
-- prática — uma atividade é planejada, concluída, atrasada (derivada) ou
-- não feita. O rótulo de "nao_feita" passou a ser "Cancelada" na UI (só
-- exibição; o valor no banco continua 'nao_feita').

-- 1) Backfill: qualquer atividade em_andamento vira planejada (a regra de
--    atraso derivada em código já reexibe as vencidas como atrasadas).
update public.activities
set status = 'planejada'
where status = 'em_andamento';

-- 2) CHECK passa a rejeitar o valor removido.
alter table public.activities
  drop constraint if exists activities_status_check;

alter table public.activities
  add constraint activities_status_check
  check (status in ('planejada', 'concluida', 'atrasada', 'nao_feita'));
