-- Adiciona um segundo canal para Luciana Freitas (RDC) e Bruno Cardoso (RTV)
-- para testar a experiência multi-canal no fluxo de registro avulso.
--
-- Antes: Luciana → só Plantar Distribuidora (Balsas + Palmas)
-- Depois: Luciana → Plantar + Terra Boa Agronegócios (via Filial Barreiras)
--
-- Antes: Bruno → só Terra Boa (LEM + Barreiras)
-- Depois: Bruno → Terra Boa + Plantar Distribuidora (via Filial Balsas)

insert into public.user_links (profile_id, channel_id, branch_id) values
  -- Luciana Freitas (RDC): segundo canal = Terra Boa Agronegócios, Filial Barreiras
  ('00000000-0000-4000-8000-000000000409', null, '00000000-0000-4000-8000-000000000312'),
  -- Bruno Cardoso (RTV): segundo canal = Plantar Distribuidora, Filial Balsas
  ('00000000-0000-4000-8000-000000000408', null, '00000000-0000-4000-8000-000000000313');
