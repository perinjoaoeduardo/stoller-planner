-- Solicitações de acesso da tela /registro.
-- O planner tem acesso controlado: usuários são criados pela
-- administração (CX) com vínculos. O auto-registro apenas registra o
-- pedido; o CX avalia e cria a conta. Quando o SSO Microsoft entrar em
-- produção, esta tabela pode virar a fila de aprovação do fluxo SSO.

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  requested_role text not null check (requested_role in ('DSM', 'RTV', 'RDC', 'CX')),
  message text,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovada', 'recusada')),
  created_at timestamptz not null default now()
);

comment on table public.access_requests is
  'Pedidos de acesso vindos do /registro; avaliados pelo time de CX.';
