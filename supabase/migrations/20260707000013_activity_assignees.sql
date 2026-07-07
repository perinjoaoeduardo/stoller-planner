-- Múltiplos responsáveis por atividade (redesign RTV, parte 1).
-- activities.responsible_id permanece por compatibilidade e será
-- removida em migração futura.

create table if not exists public.activity_assignees (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_id, profile_id)
);

create index if not exists activity_assignees_activity_id_idx
  on public.activity_assignees (activity_id);
create index if not exists activity_assignees_profile_id_idx
  on public.activity_assignees (profile_id);

-- Backfill: cada responsible_id vira uma linha de assignee.
insert into public.activity_assignees (activity_id, profile_id)
select a.id, a.responsible_id
from public.activities a
where a.responsible_id is not null
on conflict (activity_id, profile_id) do nothing;
