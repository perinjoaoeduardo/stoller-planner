-- Seed do Bloco 5: registros de execução retroativos.
--
-- Os activity_events só existem desde o Bloco 3/4, então quase nenhum
-- canal tinha histórico de execução — todos ficariam "no escuro" ao
-- mesmo tempo. Para o painel CX demonstrar os três estados reais:
--   * saudáveis  → AgroVale (201) e AgriMax (202) já têm eventos de
--                  hoje (testes dos blocos anteriores) + Sementes & Cia
--                  (204) ganha registros de 3 e 6 dias atrás
--   * em atenção → Cooperativa Campo Forte (203) com último registro
--                  há 15 dias (ainda dentro dos 21)
--   * no escuro  → Terra Boa (205) com último registro há 34 dias e
--                  Plantar (206) que NUNCA registrou execução
--
-- Também espalha eventos nas últimas ~10 semanas para o gráfico de
-- pulsação (registros por semana) ter história de verdade.

insert into public.activity_events (activity_id, profile_id, type, description, created_at)
values
  -- Canal 203 — Cooperativa Campo Forte (em atenção: último há 15 dias)
  ('00000000-0000-4000-8000-000000000716', '00000000-0000-4000-8000-000000000406', 'execucao_registrada',
   'Execução registrada por Eduardo Santin: palestra do programa de fidelidade apresentada na assembleia de cooperados.',
   now() - interval '15 days 3 hours'),
  ('00000000-0000-4000-8000-000000000718', '00000000-0000-4000-8000-000000000406', 'execucao_registrada',
   'Execução registrada por Eduardo Santin: plano de abastecimento antecipado revisado com o time de compras.',
   now() - interval '16 days 5 hours'),
  ('00000000-0000-4000-8000-000000000717', '00000000-0000-4000-8000-000000000410', 'execucao_registrada',
   'Execução registrada por André Nogueira: material impresso do programa distribuído nos balcões de Passo Fundo.',
   now() - interval '42 days 2 hours'),
  ('00000000-0000-4000-8000-000000000719', '00000000-0000-4000-8000-000000000406', 'execucao_registrada',
   'Execução registrada por Eduardo Santin: reunião com a logística do canal sobre janelas críticas concluída.',
   now() - interval '70 days 4 hours'),

  -- Canal 204 — Sementes & Cia (saudável: registros recentes)
  ('00000000-0000-4000-8000-000000000725', '00000000-0000-4000-8000-000000000407', 'execucao_registrada',
   'Execução registrada por Patrícia Ramos: treinamento de balcão da linha de biológicos concluído em Londrina.',
   now() - interval '3 days 4 hours'),
  ('00000000-0000-4000-8000-000000000727', '00000000-0000-4000-8000-000000000410', 'execucao_registrada',
   'Execução registrada por André Nogueira: proposta de gôndola exclusiva apresentada ao gerente da loja.',
   now() - interval '6 days 1 hour'),
  ('00000000-0000-4000-8000-000000000726', '00000000-0000-4000-8000-000000000407', 'execucao_registrada',
   'Execução registrada por Patrícia Ramos: comparativo técnico de inoculantes finalizado e enviado ao canal.',
   now() - interval '35 days 6 hours'),

  -- Canal 205 — Terra Boa Agronegócios (NO ESCURO: último há 34 dias)
  ('00000000-0000-4000-8000-000000000734', '00000000-0000-4000-8000-000000000408', 'execucao_registrada',
   'Execução registrada por Bruno Cardoso: proposta comercial de recuperação apresentada ao cliente-chave.',
   now() - interval '34 days 2 hours'),
  ('00000000-0000-4000-8000-000000000733', '00000000-0000-4000-8000-000000000408', 'execucao_registrada',
   'Execução registrada por Bruno Cardoso: reunião executiva com cliente-chave de Barreiras realizada.',
   now() - interval '55 days 3 hours');

-- Canal 206 — Plantar Distribuidora: propositalmente SEM nenhum evento
-- de execução ("nunca registrou" também conta como no escuro).
