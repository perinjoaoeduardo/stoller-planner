-- Remove o perfil RDC do sistema: os dois usuários RDC viram RTV
-- (mantendo os mesmos vínculos de filial, que já eram no modelo RTV).
--
-- Também adiciona um 4º canal para Bruno Cardoso (RTV): Cooperativa Campo
-- Forte via Filial Passo Fundo - RS (região Sul, contraste geográfico
-- para testar a experiência multi-canal mais rica).

-- 1) Converter perfis RDC → RTV
update public.profiles
set role = 'RTV'
where role = 'RDC';

-- 2) Atualizar constraints para não aceitarem mais RDC
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('DSM', 'RTV', 'CX'));

alter table public.access_requests drop constraint if exists access_requests_requested_role_check;
alter table public.access_requests
  add constraint access_requests_requested_role_check
  check (requested_role in ('DSM', 'RTV', 'CX'));

-- 3) Bruno Cardoso (RTV): 4º canal = Cooperativa Campo Forte, Filial Passo Fundo
insert into public.user_links (profile_id, channel_id, branch_id) values
  ('00000000-0000-4000-8000-000000000408', null, '00000000-0000-4000-8000-000000000306');
