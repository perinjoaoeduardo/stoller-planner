-- Cenário de demonstração do RTV na caixa de entrada.
--
-- O seed anterior distribuiu os registros entre vários autores, o que é
-- certo para o DSM/CX (que alternam "Ver de todos"). Mas o RTV só vê os
-- PRÓPRIOS envios — e o Bruno, que é o perfil de campo da demo, ficava
-- com dois registros crus e nenhuma das situações que a tela existe
-- para tratar.
--
-- Aqui ele ganha o conjunto completo: o lote de fotos soltas do mesmo
-- treinamento, um envio com várias fotos, um parcial e um completo.
-- Canais são os que ele realmente atende (AgriMax 202, Terra Boa 205).

insert into public.inbox_registros
  (id, autor_id, canal_id, filial_id, fotos, origem, tipo_acao, titulo, descricao, meta_id, status, recebido_em)
values
  -- ── O LOTE: 3 fotos do mesmo treinamento, mandadas soltas ──────────
  -- É o caso que justifica a seleção múltipla da triagem.
  ('00000000-0000-4000-8000-000000000931', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000304',
   array['inbox/treinamento-sorriso-a.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '3 hours'),

  ('00000000-0000-4000-8000-000000000932', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000304',
   array['inbox/treinamento-sorriso-b.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '3 hours 8 minutes'),

  ('00000000-0000-4000-8000-000000000933', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000304',
   array['inbox/treinamento-sorriso-c.jpg'], 'whatsapp',
   null, null, null, null, 'pendente', now() - interval '3 hours 15 minutes'),

  -- ── Várias fotos num envio só (exercita o empilhamento) ────────────
  ('00000000-0000-4000-8000-000000000934', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000305',
   array['inbox/passo-fundo-a.jpg', 'inbox/passo-fundo-b.jpg',
         'inbox/passo-fundo-c.jpg', 'inbox/passo-fundo-d.jpg'], 'whatsapp',
   'geracao_demanda', null, null, null, 'pendente', now() - interval '7 hours'),

  -- ── Completo: mostra o card no melhor caso ─────────────────────────
  ('00000000-0000-4000-8000-000000000935', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000205', null,
   array['inbox/terra-boa-a.jpg', 'inbox/sementes-a.jpg'], 'whatsapp',
   'reuniao_gerente', 'Reunião de resultado com a gerência da Terra Boa',
   'Fechamos o calendário de dias de campo para a próxima janela.',
   '00000000-0000-4000-8000-000000000617', 'pendente', now() - interval '1 day 3 hours');
