-- Ajusta os canais das contas de demo:
-- 1) Remove o segundo canal da Luciana Freitas (RDC) — volta a ter só Plantar
-- 2) Adiciona um terceiro canal para Bruno Cardoso (RTV): AgriMax Insumos
--    via Filial Primavera do Leste - MT (região Centro-Oeste, contrasta com
--    Terra Boa e Plantar que são Matopiba/Norte)

-- Remove o 2º canal da Luciana (Terra Boa via Filial Barreiras)
delete from public.user_links
where profile_id = '00000000-0000-4000-8000-000000000409'
  and branch_id  = '00000000-0000-4000-8000-000000000312';

-- Bruno Cardoso (RTV): 3º canal = AgriMax Insumos, Filial Primavera
insert into public.user_links (profile_id, channel_id, branch_id) values
  ('00000000-0000-4000-8000-000000000408', null, '00000000-0000-4000-8000-000000000305');
