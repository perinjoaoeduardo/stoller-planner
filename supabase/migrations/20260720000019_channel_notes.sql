-- Notas do canal: feed cronologico de aprendizados e observacoes sobre
-- o cliente, alimentado por RTV/DSM/CX ao longo do relacionamento
-- (substitui a "coluna livre de excel" que cada um mantinha por fora).
--
-- Nome em ingles (channel_notes / channel_id / author_id / body) para
-- seguir o resto do schema — channels, activities, problems, user_links.
--
-- SEM row level security, igual as demais tabelas do projeto: a
-- permissao fina (quem enxerga qual canal) vive na camada de aplicacao
-- via getScopedChannelIds/canAccessChannel. As policies de RLS aqui só
-- existiriam para o bucket de storage.

create table if not exists public.channel_notes (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  -- Caminho no bucket activity-photos (prefixo notes/). Reusa o bucket
  -- existente: a policy dele ja libera upload para autenticado.
  photo_path text,
  pinned boolean not null default false,
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Feed do canal (fixadas primeiro, depois mais recentes).
create index if not exists channel_notes_feed_idx
  on public.channel_notes (channel_id, pinned desc, created_at desc);

-- Consulta das fixadas (ultima fixada aparece primeiro).
create index if not exists channel_notes_pinned_idx
  on public.channel_notes (channel_id, pinned_at desc)
  where pinned;

comment on table public.channel_notes is
  'Notas livres do canal — feed cronologico visivel a todos do canal; autor edita/deleta, qualquer um fixa.';
