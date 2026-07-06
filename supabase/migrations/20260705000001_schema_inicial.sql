-- Stoller Planner — schema inicial
-- Hierarquia: regions → channels → branches
-- Plano por canal por safra; problems e activities pertencem ao plano.
-- RLS será configurado quando o auth real for ligado (fase de protótipo).

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region_id uuid not null references public.regions (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  channel_id uuid not null references public.channels (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  role text not null check (role in ('DSM', 'RTV', 'RDC', 'CX')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Vínculos: DSM linka em canais; RTV/RDC linkam em filiais; CX vê tudo (sem links)
create table public.user_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  channel_id uuid references public.channels (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  harvest text not null,
  status text not null default 'ativo'
    check (status in ('rascunho', 'ativo', 'encerrado')),
  created_at timestamptz not null default now()
);

create table public.problems (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  -- atividade pode existir sem problema vinculado (decisão de produto)
  problem_id uuid references public.problems (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  title text not null,
  description text,
  responsible_id uuid references public.profiles (id) on delete set null,
  due_date date,
  status text not null default 'planejada'
    check (status in ('planejada', 'em_andamento', 'concluida', 'atrasada', 'nao_feita')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_photos (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- Índices para as consultas mais comuns
create index channels_region_id_idx on public.channels (region_id);
create index branches_channel_id_idx on public.branches (channel_id);
create index user_links_profile_id_idx on public.user_links (profile_id);
create index plans_channel_id_idx on public.plans (channel_id);
create index problems_plan_id_idx on public.problems (plan_id);
create index activities_plan_id_idx on public.activities (plan_id);
create index activities_problem_id_idx on public.activities (problem_id);
create index activities_status_idx on public.activities (status);
create index activities_due_date_idx on public.activities (due_date);
create index activity_photos_activity_id_idx on public.activity_photos (activity_id);

-- Bucket de storage para fotos de execução (leitura pública)
insert into storage.buckets (id, name, public)
values ('activity-photos', 'activity-photos', true)
on conflict (id) do nothing;
