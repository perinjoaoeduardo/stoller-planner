-- Caixa de entrada — registros que chegam de fora do app (hoje WhatsApp)
-- e ainda não viraram atividade.
--
-- NOMENCLATURA: as colunas seguem a especificação do produto (português),
-- mas as FKs apontam para as tabelas reais do schema, que estão em inglês
-- (channels, branches, problems, activities, profiles). Não existe tabela
-- "canais"/"metas" — o vocabulário do domínio é PT, o do schema é EN.
--
-- Fotos: array de caminhos, sem tabela separada. A v1 não precisa de
-- metadado por foto (legenda, ordem) e uma tabela filha só para guardar
-- string custaria join em toda leitura da fila.

create table public.inbox_registros (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.profiles (id) on delete cascade,
  -- Canal + foto é o envio mínimo: todo o resto pode chegar vazio.
  canal_id uuid not null references public.channels (id) on delete cascade,
  filial_id uuid references public.branches (id) on delete set null,
  fotos text[] not null,
  origem text not null default 'whatsapp'
    check (origem in ('whatsapp', 'app', 'email')),
  -- Mesmo vocabulário de categoria do resto do app (lib/config.ts).
  tipo_acao text
    check (tipo_acao in ('reuniao_gerente', 'treinamento', 'rodada_canal', 'geracao_demanda')),
  titulo text,
  descricao text,
  meta_id uuid references public.problems (id) on delete set null,
  status text not null default 'pendente'
    check (status in ('pendente', 'registrado', 'descartado')),
  atividade_id uuid references public.activities (id) on delete set null,
  recebido_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por uuid references public.profiles (id) on delete set null,

  -- Sem foto não há registro: é a única evidência que o envio carrega.
  constraint inbox_registros_fotos_nao_vazio check (array_length(fotos, 1) >= 1)
);

create index inbox_registros_canal_status_idx
  on public.inbox_registros (canal_id, status);
create index inbox_registros_autor_status_idx
  on public.inbox_registros (autor_id, status);

-- ─── RLS ──────────────────────────────────────────────────────────────
-- O app valida escopo na camada de aplicação (lib/auth/scope.ts) e as
-- tabelas de domínio não têm RLS. Aqui a RLS entra como segunda trava
-- porque a origem do dado é EXTERNA: um dia um webhook escreve nesta
-- tabela sem passar pelas nossas actions.
--
-- A régua replica getScopedChannelIds: CX vê tudo, DSM vê os canais em
-- que está linkado, RTV vê os canais das filiais em que está linkado.

alter table public.inbox_registros enable row level security;

-- Perfil do usuário logado (auth.uid() -> profiles.id).
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Canais que o usuário enxerga, na mesma régua do app.
create or replace function public.scoped_channel_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, role from public.profiles where user_id = auth.uid() limit 1
  )
  -- CX enxerga todos os canais.
  select c.id
    from public.channels c
   where exists (select 1 from me where me.role = 'CX')
  union
  -- DSM: vínculo direto com o canal.
  select ul.channel_id
    from public.user_links ul
    join me on me.id = ul.profile_id
   where ul.channel_id is not null
  union
  -- RTV: vínculo com a filial; o canal vem dela.
  select b.channel_id
    from public.user_links ul
    join me on me.id = ul.profile_id
    join public.branches b on b.id = ul.branch_id
   where ul.branch_id is not null;
$$;

create policy "inbox select proprio ou no escopo"
  on public.inbox_registros for select to authenticated
  using (
    autor_id = public.current_profile_id()
    or canal_id in (select public.scoped_channel_ids())
  );

create policy "inbox insert do proprio autor em canal do escopo"
  on public.inbox_registros for insert to authenticated
  with check (
    autor_id = public.current_profile_id()
    and canal_id in (select public.scoped_channel_ids())
  );

-- UPDATE/DELETE são da triagem (prompt 2). Ficam escritas e restritivas
-- desde já: o autor mexe no que é dele; quem pode editar o plano do
-- canal (DSM do canal e CX) mexe no do canal.
create policy "inbox update autor ou gestor do canal"
  on public.inbox_registros for update to authenticated
  using (
    autor_id = public.current_profile_id()
    or canal_id in (select public.scoped_channel_ids())
  )
  with check (
    autor_id = public.current_profile_id()
    or canal_id in (select public.scoped_channel_ids())
  );

create policy "inbox delete autor ou gestor do canal"
  on public.inbox_registros for delete to authenticated
  using (
    autor_id = public.current_profile_id()
    or canal_id in (select public.scoped_channel_ids())
  );
