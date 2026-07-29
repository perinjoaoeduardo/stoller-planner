-- Seed da caixa de entrada — envios simulados.
--
-- A integração real (WhatsApp) não existe ainda. Sem seed a tela nasce
-- vazia e não demonstra nada. Sai quando a integração entrar.
--
-- Datas são RELATIVAS a now(): o seed precisa continuar fazendo sentido
-- daqui a um mês. "há 2 horas" fixo em timestamp vira "há 3 meses".
--
-- Distribuição pedida: metade crus (só canal + foto), um terço parciais
-- (+ tipo de ação), o resto completos. Idades variadas, com 3 parados há
-- mais de 7 dias para exercitar o alarme de espera. Autores diferentes
-- para o toggle "Ver de todos" ter o que mostrar.

insert into public.inbox_registros
  (id, autor_id, canal_id, filial_id, fotos, origem, tipo_acao, titulo, descricao, meta_id, status, recebido_em)
values
  -- ── CRUS: só canal + foto (7 de 15) ────────────────────────────────
  -- Três do MESMO canal na MESMA janela: o caso real de várias fotos do
  -- mesmo treinamento mandadas soltas pelo WhatsApp.
  ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000303',
   array['inbox/treinamento-sorriso-a.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '2 hours'),

  ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000303',
   array['inbox/treinamento-sorriso-b.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '2 hours 10 minutes'),

  ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000303',
   array['inbox/treinamento-sorriso-c.jpg', 'inbox/treinamento-sorriso-d.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '2 hours 25 minutes'),

  ('00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000405',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000304',
   array['inbox/visita-dourados-a.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '9 hours'),

  ('00000000-0000-4000-8000-000000000905', '00000000-0000-4000-8000-000000000405',
   '00000000-0000-4000-8000-000000000202', null,
   array['inbox/balcao-primavera-a.jpg', 'inbox/balcao-primavera-b.jpg',
         'inbox/balcao-primavera-c.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '1 day 4 hours'),

  ('00000000-0000-4000-8000-000000000906', '00000000-0000-4000-8000-000000000406',
   '00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000307',
   array['inbox/cascavel-a.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '2 days 6 hours'),

  -- Parado há mais de 7 dias: alarme de espera em âmbar.
  ('00000000-0000-4000-8000-000000000907', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000205', null,
   array['inbox/terra-boa-a.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '12 days'),

  -- ── PARCIAIS: + tipo de ação, sem meta e sem título (5 de 15) ───────
  ('00000000-0000-4000-8000-000000000908', '00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000301',
   array['inbox/rio-verde-visita-a.jpg', 'inbox/rio-verde-visita-b.jpg'], 'whatsapp',
   'rodada_canal', null, null, null, 'pendente', now() - interval '5 hours'),

  ('00000000-0000-4000-8000-000000000909', '00000000-0000-4000-8000-000000000405',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000305',
   array['inbox/primavera-treino-a.jpg'], 'whatsapp',
   'treinamento', null, null, null, 'pendente', now() - interval '1 day 9 hours'),

  ('00000000-0000-4000-8000-000000000910', '00000000-0000-4000-8000-000000000406',
   '00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000306',
   array['inbox/passo-fundo-a.jpg', 'inbox/passo-fundo-b.jpg',
         'inbox/passo-fundo-c.jpg', 'inbox/passo-fundo-d.jpg'], 'whatsapp',
   'geracao_demanda', null, null, null, 'pendente', now() - interval '2 days 2 hours'),

  ('00000000-0000-4000-8000-000000000911', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000206', null,
   array['inbox/plantar-a.jpg'], 'whatsapp',
   'reuniao_gerente', null, null, null, 'pendente', now() - interval '3 days'),

  -- Segundo parado há mais de 7 dias.
  ('00000000-0000-4000-8000-000000000912', '00000000-0000-4000-8000-000000000407',
   '00000000-0000-4000-8000-000000000204', null,
   array['inbox/sementes-a.jpg', 'inbox/sementes-b.jpg'], 'whatsapp',
   'treinamento', null, null, null, 'pendente', now() - interval '9 days'),

  -- ── COMPLETOS: todos os campos (3 de 15) ───────────────────────────
  ('00000000-0000-4000-8000-000000000913', '00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000302',
   array['inbox/rondonopolis-mix-a.jpg', 'inbox/rondonopolis-mix-b.jpg'], 'whatsapp',
   'reuniao_gerente', 'Reunião de mix com o gerente da Rondonópolis',
   'Apresentei o comparativo de giro por SKU e fechamos teste com mais 2 linhas.',
   '00000000-0000-4000-8000-000000000603', 'pendente', now() - interval '6 hours'),

  ('00000000-0000-4000-8000-000000000914', '00000000-0000-4000-8000-000000000405',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000304',
   array['inbox/dourados-bio-a.jpg'], 'whatsapp',
   'geracao_demanda', 'Dia de campo de bioestimulantes em soja',
   'Trinta produtores na fazenda-modelo; coletamos 12 contatos para follow-up.',
   '00000000-0000-4000-8000-000000000605', 'pendente', now() - interval '1 day 2 hours'),

  -- Terceiro parado há mais de 7 dias.
  ('00000000-0000-4000-8000-000000000915', '00000000-0000-4000-8000-000000000406',
   '00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000308',
   array['inbox/ponta-grossa-a.jpg', 'inbox/ponta-grossa-b.jpg',
         'inbox/ponta-grossa-c.jpg'], 'whatsapp',
   'treinamento', 'Capacitação da equipe de balcão em Ponta Grossa',
   'Turma de 9 vendedores; foco em posicionamento de biológicos.',
   null, 'pendente', now() - interval '8 days 5 hours');

-- ── Histórico para o prompt 2 (não aparece na fila) ──────────────────
insert into public.inbox_registros
  (id, autor_id, canal_id, filial_id, fotos, origem, tipo_acao, titulo, descricao,
   meta_id, status, recebido_em, resolvido_em, resolvido_por)
values
  ('00000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000303',
   array['inbox/resolvido-a.jpg'], 'whatsapp',
   'treinamento', 'Treinamento de fungicidas em Sorriso', null,
   '00000000-0000-4000-8000-000000000601', 'registrado',
   now() - interval '5 days', now() - interval '4 days',
   '00000000-0000-4000-8000-000000000401'),

  ('00000000-0000-4000-8000-000000000922', '00000000-0000-4000-8000-000000000405',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000304',
   array['inbox/resolvido-b.jpg', 'inbox/resolvido-c.jpg'], 'whatsapp',
   'rodada_canal', 'Rodada de visitas em Dourados', null,
   '00000000-0000-4000-8000-000000000605', 'registrado',
   now() - interval '6 days', now() - interval '5 days',
   '00000000-0000-4000-8000-000000000401'),

  ('00000000-0000-4000-8000-000000000923', '00000000-0000-4000-8000-000000000406',
   '00000000-0000-4000-8000-000000000203', null,
   array['inbox/resolvido-d.jpg'], 'whatsapp',
   'geracao_demanda', 'Ação de giro no Campo Forte', null,
   null, 'registrado',
   now() - interval '9 days', now() - interval '8 days',
   '00000000-0000-4000-8000-000000000402'),

  ('00000000-0000-4000-8000-000000000924', '00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000201', null,
   array['inbox/descartado-a.jpg'], 'whatsapp',
   null, null, null, null, 'descartado',
   now() - interval '7 days', now() - interval '6 days',
   '00000000-0000-4000-8000-000000000401'),

  ('00000000-0000-4000-8000-000000000925', '00000000-0000-4000-8000-000000000405',
   '00000000-0000-4000-8000-000000000202', null,
   array['inbox/descartado-b.jpg'], 'whatsapp',
   null, null, null, null, 'descartado',
   now() - interval '10 days', now() - interval '9 days',
   '00000000-0000-4000-8000-000000000401');
