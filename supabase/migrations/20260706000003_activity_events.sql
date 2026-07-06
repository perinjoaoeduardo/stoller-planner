-- Stoller Planner — eventos de atividade (linha do tempo)
-- Registra marcos simples da vida de uma atividade: criação, mudança de
-- status e fotos adicionadas/removidas. Alimenta o card "Linha do tempo"
-- na página de detalhe da atividade.

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  type text not null check (
    type in ('criada', 'editada', 'status_alterado', 'foto_adicionada', 'foto_removida')
  ),
  description text,
  created_at timestamptz not null default now()
);

create index activity_events_activity_id_idx
  on public.activity_events (activity_id);
create index activity_events_created_at_idx
  on public.activity_events (created_at);
