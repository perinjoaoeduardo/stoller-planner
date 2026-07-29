-- Repõe a fila de demonstração do RTV e cobre o caso do envio PRONTO.
--
-- Os registros da migração 24 foram consumidos na validação da triagem
-- (viraram atividade, como deviam). Sem eles a caixa de entrada abre com
-- três envios crus e não mostra a decisão mais importante da tela: o
-- envio que já chegou completo do WhatsApp e vira atividade num clique,
-- sem formulário nenhum.
--
-- Cada registro tem foto PRÓPRIA: a triagem move o arquivo, então dois
-- registros apontando para o mesmo caminho quebram o segundo.

insert into public.inbox_registros
  (id, autor_id, canal_id, filial_id, fotos, origem, tipo_acao, titulo, descricao, meta_id, status, recebido_em)
values
  -- ── PRONTO com meta: o melhor caso, um clique em "Registrar" ───────
  ('00000000-0000-4000-8000-000000000941', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000304',
   array['inbox/rtv-bio-dourados-a.jpg', 'inbox/rtv-bio-dourados-b.jpg'], 'whatsapp',
   'geracao_demanda', 'Dia de campo de bioestimulantes em Dourados',
   'Vinte e dois produtores no talhão demonstrativo. Comparativo de soja tratada e testemunha, com coleta de raiz na frente do pessoal.',
   '00000000-0000-4000-8000-000000000605', 'pendente', now() - interval '2 hours'),

  -- ── PRONTO sem meta: registra igual, e a meta vira pendência ───────
  ('00000000-0000-4000-8000-000000000942', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000312',
   array['inbox/rtv-barreiras-a.jpg'], 'whatsapp',
   'rodada_canal', 'Visita ao cliente-chave de Barreiras',
   'Retomamos o histórico de compra e alinhamos a janela do algodão.',
   null, 'pendente', now() - interval '5 hours'),

  -- ── Lote de fotos num envio só (exercita o empilhamento) ───────────
  ('00000000-0000-4000-8000-000000000943', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000305',
   array['inbox/rtv-primavera-a.jpg', 'inbox/rtv-primavera-b.jpg',
         'inbox/rtv-primavera-c.jpg'], 'whatsapp',
   'treinamento', null, null, null, 'pendente', now() - interval '1 day 2 hours'),

  -- ── Parcial: tem título, falta o resto ─────────────────────────────
  ('00000000-0000-4000-8000-000000000944', '00000000-0000-4000-8000-000000000408',
   '00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000311',
   array['inbox/rtv-lem-a.jpg'], 'whatsapp',
   null, 'Rodada de lojas em LEM', null, null, 'pendente', now() - interval '2 days 4 hours');
