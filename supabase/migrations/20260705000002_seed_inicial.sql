-- Stoller Planner — seed inicial (dados fake realistas, safra 2025/26)
-- IDs fixos para facilitar referências e depuração.

-- ─── Regiões ────────────────────────────────────────────────────────────────
insert into public.regions (id, name) values
  ('00000000-0000-4000-8000-000000000101', 'Regional Centro-Oeste'),
  ('00000000-0000-4000-8000-000000000102', 'Regional Sul'),
  ('00000000-0000-4000-8000-000000000103', 'Regional Matopiba');

-- ─── Canais ─────────────────────────────────────────────────────────────────
insert into public.channels (id, name, region_id) values
  ('00000000-0000-4000-8000-000000000201', 'AgroVale Distribuidora',   '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000202', 'AgriMax Insumos',          '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000203', 'Cooperativa Campo Forte',  '00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000204', 'Sementes & Cia',           '00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000205', 'Terra Boa Agronegócios',   '00000000-0000-4000-8000-000000000103'),
  ('00000000-0000-4000-8000-000000000206', 'Plantar Distribuidora',    '00000000-0000-4000-8000-000000000103');

-- ─── Filiais ────────────────────────────────────────────────────────────────
insert into public.branches (id, name, city, channel_id) values
  ('00000000-0000-4000-8000-000000000301', 'Filial Rio Verde',        'Rio Verde - GO',               '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000302', 'Filial Rondonópolis',     'Rondonópolis - MT',            '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000303', 'Filial Sorriso',          'Sorriso - MT',                 '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000304', 'Filial Dourados',         'Dourados - MS',                '00000000-0000-4000-8000-000000000202'),
  ('00000000-0000-4000-8000-000000000305', 'Filial Primavera',        'Primavera do Leste - MT',      '00000000-0000-4000-8000-000000000202'),
  ('00000000-0000-4000-8000-000000000306', 'Filial Passo Fundo',      'Passo Fundo - RS',             '00000000-0000-4000-8000-000000000203'),
  ('00000000-0000-4000-8000-000000000307', 'Filial Cascavel',         'Cascavel - PR',                '00000000-0000-4000-8000-000000000203'),
  ('00000000-0000-4000-8000-000000000308', 'Filial Ponta Grossa',     'Ponta Grossa - PR',            '00000000-0000-4000-8000-000000000203'),
  ('00000000-0000-4000-8000-000000000309', 'Filial Londrina',         'Londrina - PR',                '00000000-0000-4000-8000-000000000204'),
  ('00000000-0000-4000-8000-000000000310', 'Filial Chapecó',          'Chapecó - SC',                 '00000000-0000-4000-8000-000000000204'),
  ('00000000-0000-4000-8000-000000000311', 'Filial LEM',              'Luís Eduardo Magalhães - BA',  '00000000-0000-4000-8000-000000000205'),
  ('00000000-0000-4000-8000-000000000312', 'Filial Barreiras',        'Barreiras - BA',               '00000000-0000-4000-8000-000000000205'),
  ('00000000-0000-4000-8000-000000000313', 'Filial Balsas',           'Balsas - MA',                  '00000000-0000-4000-8000-000000000206'),
  ('00000000-0000-4000-8000-000000000314', 'Filial Palmas',           'Palmas - TO',                  '00000000-0000-4000-8000-000000000206');

-- ─── Perfis (12 usuários: 3 DSM, 5 RTV, 2 RDC, 2 CX) ───────────────────────
insert into public.profiles (id, full_name, role) values
  ('00000000-0000-4000-8000-000000000401', 'Carlos Menezes',      'DSM'),
  ('00000000-0000-4000-8000-000000000402', 'Fernanda Oliveira',   'DSM'),
  ('00000000-0000-4000-8000-000000000403', 'Ricardo Tavares',     'DSM'),
  ('00000000-0000-4000-8000-000000000404', 'João Pedro Almeida',  'RTV'),
  ('00000000-0000-4000-8000-000000000405', 'Marina Costa',        'RTV'),
  ('00000000-0000-4000-8000-000000000406', 'Eduardo Santin',      'RTV'),
  ('00000000-0000-4000-8000-000000000407', 'Patrícia Ramos',      'RTV'),
  ('00000000-0000-4000-8000-000000000408', 'Bruno Cardoso',       'RTV'),
  ('00000000-0000-4000-8000-000000000409', 'Luciana Freitas',     'RDC'),
  ('00000000-0000-4000-8000-000000000410', 'André Nogueira',      'RDC'),
  ('00000000-0000-4000-8000-000000000411', 'Camila Duarte',       'CX'),
  ('00000000-0000-4000-8000-000000000412', 'Rafael Lima',         'CX');

-- ─── Vínculos (DSM → canais; RTV/RDC → filiais; CX sem vínculo) ─────────────
insert into public.user_links (profile_id, channel_id, branch_id) values
  -- Carlos Menezes (DSM Centro-Oeste): AgroVale + AgriMax
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000201', null),
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000202', null),
  -- Fernanda Oliveira (DSM Sul): Campo Forte + Sementes & Cia
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000203', null),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000204', null),
  -- Ricardo Tavares (DSM Matopiba): Terra Boa + Plantar
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000205', null),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000206', null),
  -- João Pedro Almeida (RTV AgroVale): Rio Verde, Rondonópolis, Sorriso
  ('00000000-0000-4000-8000-000000000404', null, '00000000-0000-4000-8000-000000000301'),
  ('00000000-0000-4000-8000-000000000404', null, '00000000-0000-4000-8000-000000000302'),
  ('00000000-0000-4000-8000-000000000404', null, '00000000-0000-4000-8000-000000000303'),
  -- Marina Costa (RTV AgriMax): Dourados, Primavera
  ('00000000-0000-4000-8000-000000000405', null, '00000000-0000-4000-8000-000000000304'),
  ('00000000-0000-4000-8000-000000000405', null, '00000000-0000-4000-8000-000000000305'),
  -- Eduardo Santin (RTV Campo Forte): Passo Fundo, Cascavel, Ponta Grossa
  ('00000000-0000-4000-8000-000000000406', null, '00000000-0000-4000-8000-000000000306'),
  ('00000000-0000-4000-8000-000000000406', null, '00000000-0000-4000-8000-000000000307'),
  ('00000000-0000-4000-8000-000000000406', null, '00000000-0000-4000-8000-000000000308'),
  -- Patrícia Ramos (RTV Sementes & Cia): Londrina, Chapecó
  ('00000000-0000-4000-8000-000000000407', null, '00000000-0000-4000-8000-000000000309'),
  ('00000000-0000-4000-8000-000000000407', null, '00000000-0000-4000-8000-000000000310'),
  -- Bruno Cardoso (RTV Terra Boa): LEM, Barreiras
  ('00000000-0000-4000-8000-000000000408', null, '00000000-0000-4000-8000-000000000311'),
  ('00000000-0000-4000-8000-000000000408', null, '00000000-0000-4000-8000-000000000312'),
  -- Luciana Freitas (RDC Plantar): Balsas, Palmas
  ('00000000-0000-4000-8000-000000000409', null, '00000000-0000-4000-8000-000000000313'),
  ('00000000-0000-4000-8000-000000000409', null, '00000000-0000-4000-8000-000000000314'),
  -- André Nogueira (RDC Sul): Passo Fundo, Londrina
  ('00000000-0000-4000-8000-000000000410', null, '00000000-0000-4000-8000-000000000306'),
  ('00000000-0000-4000-8000-000000000410', null, '00000000-0000-4000-8000-000000000309');

-- ─── Planos (1 ativo por canal, safra 2025/26) ──────────────────────────────
insert into public.plans (id, channel_id, harvest, status) values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000201', 'Safra 2025/26', 'ativo'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000202', 'Safra 2025/26', 'ativo'),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000203', 'Safra 2025/26', 'ativo'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000204', 'Safra 2025/26', 'ativo'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000205', 'Safra 2025/26', 'ativo'),
  ('00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000206', 'Safra 2025/26', 'ativo');

-- ─── Problemas ──────────────────────────────────────────────────────────────
insert into public.problems (id, plan_id, title, description, order_index) values
  -- Plano AgroVale
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000501', 'Queda de participação em fungicidas na região de Sorriso', 'Share de fungicidas caiu de 18% para 11% na última safra; concorrente entrou com pacote agressivo.', 0),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000501', 'Vendedores de Rio Verde não conhecem a linha de biológicos', 'Equipe de balcão não oferece a linha por insegurança técnica.', 1),
  ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000501', 'Mix concentrado em 2 produtos em Rondonópolis', '80% do faturamento vem de apenas 2 SKUs; risco alto de dependência.', 2),
  ('00000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000501', 'Cliente-chave reduziu volume 30% vs safra anterior', 'Fazenda Santa Luzia migrou parte das compras para canal concorrente.', 3),
  -- Plano AgriMax
  ('00000000-0000-4000-8000-000000000605', '00000000-0000-4000-8000-000000000502', 'Baixa penetração de bioestimulantes em soja em Dourados', 'Menos de 5% dos clientes de soja usam bioestimulantes; potencial de área muito acima disso.', 0),
  ('00000000-0000-4000-8000-000000000606', '00000000-0000-4000-8000-000000000502', 'Equipe comercial sem meta clara para nutrição foliar', 'Linha de nutrição foliar sem metas por vendedor; venda apenas reativa.', 1),
  ('00000000-0000-4000-8000-000000000607', '00000000-0000-4000-8000-000000000502', 'Concorrente ganhou prateleira com pacote de barter agressivo', 'Cliente prioriza portfólio do concorrente por condições de troca por saca.', 2),
  ('00000000-0000-4000-8000-000000000608', '00000000-0000-4000-8000-000000000502', 'Estoque parado próximo do vencimento em Primavera', 'Lote com vencimento em 8 meses sem giro previsto.', 3),
  -- Plano Campo Forte
  ('00000000-0000-4000-8000-000000000609', '00000000-0000-4000-8000-000000000503', 'Cooperados de Passo Fundo desconhecem programa de fidelidade', 'Programa lançado há 1 ano com adesão de apenas 12% dos cooperados ativos.', 0),
  ('00000000-0000-4000-8000-000000000610', '00000000-0000-4000-8000-000000000503', 'Ruptura de estoque em janelas críticas de aplicação', 'Faltas recorrentes em outubro e fevereiro geram perda de venda e insatisfação.', 1),
  ('00000000-0000-4000-8000-000000000611', '00000000-0000-4000-8000-000000000503', 'Baixo giro de tratamento de sementes em Cascavel', 'TS industrial ganhou espaço; linha on farm parada na prateleira.', 2),
  -- Plano Sementes & Cia
  ('00000000-0000-4000-8000-000000000612', '00000000-0000-4000-8000-000000000504', 'Time de balcão sem treinamento na linha de biológicos', 'Rotatividade alta deixou o balcão sem ninguém treinado na linha.', 0),
  ('00000000-0000-4000-8000-000000000613', '00000000-0000-4000-8000-000000000504', 'Perda de share em inoculantes para marca própria do canal', 'Canal empurra marca própria com margem maior; Stoller perdeu 9 p.p. de share.', 1),
  ('00000000-0000-4000-8000-000000000614', '00000000-0000-4000-8000-000000000504', 'Positivação baixa em clientes de médio porte em Chapecó', 'Apenas 30% da carteira média positivada na última safra.', 2),
  ('00000000-0000-4000-8000-000000000615', '00000000-0000-4000-8000-000000000504', 'Falta de demonstração de campo na região de Londrina', 'Produtores pedem prova local de resultado antes de adotar a linha.', 3),
  -- Plano Terra Boa
  ('00000000-0000-4000-8000-000000000616', '00000000-0000-4000-8000-000000000505', 'Expansão de área em LEM sem cobertura comercial adequada', 'Novas áreas de cerrado abertas sem promotor técnico dedicado.', 0),
  ('00000000-0000-4000-8000-000000000617', '00000000-0000-4000-8000-000000000505', 'Cliente-chave de Barreiras reduziu volume 30%', 'Grupo agrícola renegociou com concorrente após problema de entrega.', 1),
  ('00000000-0000-4000-8000-000000000618', '00000000-0000-4000-8000-000000000505', 'Baixa conversão de visitas em pedidos no algodão', 'Muitas visitas técnicas sem fechamento; abordagem comercial frágil.', 2),
  ('00000000-0000-4000-8000-000000000619', '00000000-0000-4000-8000-000000000505', 'Mix concentrado em 2 produtos', 'Portfólio amplo mas faturamento concentrado; metas por linha inexistentes.', 3),
  ('00000000-0000-4000-8000-000000000620', '00000000-0000-4000-8000-000000000505', 'Inadimplência crescente em contas estratégicas', 'Títulos vencidos cresceram 40% no semestre; risco de bloqueio de vendas.', 4),
  -- Plano Plantar
  ('00000000-0000-4000-8000-000000000621', '00000000-0000-4000-8000-000000000506', 'Vendedores de Balsas não conhecem a linha de biológicos', 'Equipe nova contratada na entressafra sem formação técnica na linha.', 0),
  ('00000000-0000-4000-8000-000000000622', '00000000-0000-4000-8000-000000000506', 'Logística de entrega atrasando aplicações em Palmas', 'Atrasos de 5-10 dias nas entregas comprometem janelas de aplicação.', 1),
  ('00000000-0000-4000-8000-000000000623', '00000000-0000-4000-8000-000000000506', 'Share de fungicidas abaixo da média nacional', 'Região com 7% de share vs 15% de média Brasil.', 2);

-- ─── Atividades (45; ~20% sem problema vinculado; todos os 5 status) ────────
insert into public.activities (id, plan_id, problem_id, branch_id, title, description, responsible_id, due_date, status, completed_at) values
  -- Plano AgroVale (8)
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000303', 'Treinamento da equipe de Sorriso em fungicidas premium', 'Capacitação técnica e argumentário de venda para o portfólio de fungicidas.', '00000000-0000-4000-8000-000000000404', '2025-09-15', 'concluida', '2025-09-14T14:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000303', 'Dia de campo com demonstração de fungicida em soja', 'Talhão demonstrativo com produtor referência da região.', '00000000-0000-4000-8000-000000000404', '2025-11-20', 'concluida', '2025-11-22T10:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000301', 'Workshop da linha de biológicos para balcão de Rio Verde', 'Meio período com demonstração prática e material de apoio.', '00000000-0000-4000-8000-000000000404', '2025-10-10', 'nao_feita', null),
  ('00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000301', 'Visita técnica conjunta com agrônomo Stoller', 'Acompanhar 3 vendedores em visitas a clientes com foco em biológicos.', '00000000-0000-4000-8000-000000000401', '2026-02-12', 'concluida', '2026-02-12T17:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000705', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000302', 'Campanha de mix mínimo com bonificação em Rondonópolis', 'Incentivo escalonado para pedidos com 4+ linhas do portfólio.', '00000000-0000-4000-8000-000000000404', '2026-03-31', 'atrasada', null),
  ('00000000-0000-4000-8000-000000000706', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000302', 'Plano de recuperação do cliente Fazenda Santa Luzia', 'Reunião com sócios, proposta comercial e cronograma de visitas técnicas.', '00000000-0000-4000-8000-000000000401', '2026-01-30', 'em_andamento', null),
  ('00000000-0000-4000-8000-000000000707', '00000000-0000-4000-8000-000000000501', null, '00000000-0000-4000-8000-000000000301', 'Levantamento de estoque de passagem na filial', 'Inventário de produtos Stoller antes do fechamento do plano de compra.', '00000000-0000-4000-8000-000000000404', '2026-07-15', 'planejada', null),
  ('00000000-0000-4000-8000-000000000708', '00000000-0000-4000-8000-000000000501', null, '00000000-0000-4000-8000-000000000303', 'Reunião de alinhamento de metas da safra com gerência', 'Fechamento das metas 2026/27 com a diretoria do canal.', '00000000-0000-4000-8000-000000000401', '2026-08-10', 'planejada', null),
  -- Plano AgriMax (7)
  ('00000000-0000-4000-8000-000000000709', '00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000605', '00000000-0000-4000-8000-000000000304', 'Ensaio demonstrativo de bioestimulante em soja', 'Área de 10 ha com protocolo Stoller vs testemunha.', '00000000-0000-4000-8000-000000000405', '2025-12-05', 'concluida', '2025-12-04T09:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000710', '00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000605', '00000000-0000-4000-8000-000000000304', 'Coleta de resultados do ensaio e apresentação ao canal', 'Consolidar dados de produtividade e apresentar para equipe comercial.', '00000000-0000-4000-8000-000000000405', '2026-03-20', 'em_andamento', null),
  ('00000000-0000-4000-8000-000000000711', '00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000606', '00000000-0000-4000-8000-000000000305', 'Definição de metas por vendedor para nutrição foliar', 'Workshop de metas com gerência comercial do canal.', '00000000-0000-4000-8000-000000000401', '2025-09-30', 'concluida', '2025-10-01T16:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000712', '00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000607', '00000000-0000-4000-8000-000000000304', 'Proposta de pacote comercial competitivo (barter)', 'Estruturar condição de troca por saca competitiva com o concorrente.', '00000000-0000-4000-8000-000000000401', '2026-04-15', 'atrasada', null),
  ('00000000-0000-4000-8000-000000000713', '00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000608', '00000000-0000-4000-8000-000000000305', 'Ação de queima de estoque com desconto progressivo', 'Campanha relâmpago para girar lote próximo do vencimento.', '00000000-0000-4000-8000-000000000405', '2026-05-30', 'nao_feita', null),
  ('00000000-0000-4000-8000-000000000714', '00000000-0000-4000-8000-000000000502', null, '00000000-0000-4000-8000-000000000305', 'Visita de relacionamento à diretoria do canal', 'Agenda executiva semestral com sócios da AgriMax.', '00000000-0000-4000-8000-000000000401', '2026-07-22', 'planejada', null),
  ('00000000-0000-4000-8000-000000000715', '00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000606', '00000000-0000-4000-8000-000000000304', 'Acompanhamento mensal do funil de vendas', 'Rotina de revisão do funil de nutrição foliar com o gerente.', '00000000-0000-4000-8000-000000000405', '2026-08-28', 'planejada', null),
  -- Plano Campo Forte (9)
  ('00000000-0000-4000-8000-000000000716', '00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000609', '00000000-0000-4000-8000-000000000306', 'Palestra do programa de fidelidade na assembleia de cooperados', 'Apresentação de 30 min na assembleia anual da cooperativa.', '00000000-0000-4000-8000-000000000406', '2025-10-18', 'concluida', '2025-10-18T11:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000717', '00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000609', '00000000-0000-4000-8000-000000000306', 'Material impresso do programa nos balcões', 'Distribuir folders e treinar balconistas para explicar a mecânica.', '00000000-0000-4000-8000-000000000406', '2025-11-05', 'concluida', '2025-11-08T15:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000718', '00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000610', '00000000-0000-4000-8000-000000000307', 'Plano de abastecimento antecipado pré-plantio', 'Previsão de demanda e pedidos programados para evitar ruptura.', '00000000-0000-4000-8000-000000000402', '2026-06-30', 'em_andamento', null),
  ('00000000-0000-4000-8000-000000000719', '00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000610', '00000000-0000-4000-8000-000000000308', 'Reunião com logística do canal sobre janelas críticas', 'Alinhar calendário de aplicação com planejamento de estoque.', '00000000-0000-4000-8000-000000000406', '2026-02-10', 'concluida', '2026-02-15T10:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000720', '00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000611', '00000000-0000-4000-8000-000000000307', 'Campanha de giro de TS casada com venda de sementes', 'Combo tratamento de sementes + semente com condição especial.', '00000000-0000-4000-8000-000000000406', '2026-04-30', 'atrasada', null),
  ('00000000-0000-4000-8000-000000000721', '00000000-0000-4000-8000-000000000503', null, '00000000-0000-4000-8000-000000000308', 'Mapeamento de clientes inativos em Ponta Grossa', 'Cruzar carteira da cooperativa com histórico de compras Stoller.', '00000000-0000-4000-8000-000000000406', '2026-07-31', 'planejada', null),
  ('00000000-0000-4000-8000-000000000722', '00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000611', '00000000-0000-4000-8000-000000000307', 'Treinamento técnico de tratamento de sementes', 'Prática de dose e calda com equipe de balcão de Cascavel.', '00000000-0000-4000-8000-000000000406', '2025-09-25', 'nao_feita', null),
  ('00000000-0000-4000-8000-000000000723', '00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000609', '00000000-0000-4000-8000-000000000306', 'Revisão trimestral de pontuação dos cooperados', 'Auditoria da pontuação e comunicação ativa aos participantes.', '00000000-0000-4000-8000-000000000402', '2026-08-15', 'planejada', null),
  ('00000000-0000-4000-8000-000000000724', '00000000-0000-4000-8000-000000000503', null, '00000000-0000-4000-8000-000000000306', 'Auditoria de execução de PDV nas filiais do Sul', 'Checklist de materiais e exposição de produtos Stoller.', '00000000-0000-4000-8000-000000000402', '2026-05-20', 'concluida', '2026-05-18T13:00:00-03:00'),
  -- Plano Sementes & Cia (6)
  ('00000000-0000-4000-8000-000000000725', '00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000612', '00000000-0000-4000-8000-000000000309', 'Treinamento de balcão: linha de biológicos', 'Formação técnica completa para o time novo de Londrina.', '00000000-0000-4000-8000-000000000407', '2025-10-08', 'concluida', '2025-10-08T18:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000726', '00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000613', '00000000-0000-4000-8000-000000000310', 'Comparativo técnico: inoculantes Stoller vs marca própria', 'Dossiê com dados de nodulação e produtividade para o comprador.', '00000000-0000-4000-8000-000000000407', '2026-01-15', 'concluida', '2026-01-20T09:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000727', '00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000613', '00000000-0000-4000-8000-000000000309', 'Negociação de espaço de gôndola exclusivo', 'Acordo de exposição preferencial na loja matriz.', '00000000-0000-4000-8000-000000000402', '2026-03-10', 'em_andamento', null),
  ('00000000-0000-4000-8000-000000000728', '00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000614', '00000000-0000-4000-8000-000000000310', 'Rota de positivação de médios clientes em Chapecó', 'Roteiro quinzenal cobrindo 25 clientes de médio porte.', '00000000-0000-4000-8000-000000000407', '2026-06-15', 'atrasada', null),
  ('00000000-0000-4000-8000-000000000729', '00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000615', '00000000-0000-4000-8000-000000000309', 'Unidade demonstrativa na região de Londrina', 'Implantar UD com produtor formador de opinião.', '00000000-0000-4000-8000-000000000407', '2025-11-30', 'nao_feita', null),
  ('00000000-0000-4000-8000-000000000730', '00000000-0000-4000-8000-000000000504', null, '00000000-0000-4000-8000-000000000310', 'Pesquisa de satisfação com clientes do canal', 'Aplicar NPS na carteira ativa e consolidar devolutivas.', '00000000-0000-4000-8000-000000000407', '2026-08-05', 'planejada', null),
  -- Plano Terra Boa (8)
  ('00000000-0000-4000-8000-000000000731', '00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000616', '00000000-0000-4000-8000-000000000311', 'Contratação e onboarding de promotor técnico em LEM', 'Seleção conjunta com o canal e trilha de integração de 30 dias.', '00000000-0000-4000-8000-000000000403', '2025-09-20', 'concluida', '2025-09-28T12:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000732', '00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000616', '00000000-0000-4000-8000-000000000311', 'Roteirização de visitas na expansão do oeste baiano', 'Mapa de novas áreas e agenda quinzenal de cobertura.', '00000000-0000-4000-8000-000000000408', '2025-12-10', 'concluida', '2025-12-09T08:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000733', '00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000617', '00000000-0000-4000-8000-000000000312', 'Reunião executiva com cliente-chave de Barreiras', 'Diretoria Stoller + sócios do grupo agrícola; pauta de reconquista.', '00000000-0000-4000-8000-000000000403', '2026-02-20', 'concluida', '2026-02-20T19:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000734', '00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000617', '00000000-0000-4000-8000-000000000312', 'Proposta comercial personalizada de recuperação de volume', 'Condições especiais + garantia de entrega com SLA.', '00000000-0000-4000-8000-000000000403', '2026-03-15', 'em_andamento', null),
  ('00000000-0000-4000-8000-000000000735', '00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000618', '00000000-0000-4000-8000-000000000311', 'Capacitação em abordagem de vendas para algodão', 'Treinamento de fechamento e objeções para a equipe do canal.', '00000000-0000-4000-8000-000000000408', '2026-04-10', 'atrasada', null),
  ('00000000-0000-4000-8000-000000000736', '00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000619', '00000000-0000-4000-8000-000000000312', 'Campanha de diversificação de mix com metas por linha', 'Metas de venda por família de produto com premiação.', '00000000-0000-4000-8000-000000000408', '2026-05-25', 'nao_feita', null),
  ('00000000-0000-4000-8000-000000000737', '00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000620', '00000000-0000-4000-8000-000000000311', 'Comitê de crédito com financeiro do canal', 'Revisão de limites e plano de regularização de títulos vencidos.', '00000000-0000-4000-8000-000000000403', '2026-07-08', 'planejada', null),
  ('00000000-0000-4000-8000-000000000738', '00000000-0000-4000-8000-000000000505', null, '00000000-0000-4000-8000-000000000312', 'Participação na Bahia Farm Show com estande conjunto', 'Presença institucional e geração de leads com o canal.', '00000000-0000-4000-8000-000000000408', '2026-06-12', 'concluida', '2026-06-13T20:00:00-03:00'),
  -- Plano Plantar (7)
  ('00000000-0000-4000-8000-000000000739', '00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000621', '00000000-0000-4000-8000-000000000313', 'Treinamento da linha de biológicos para vendedores de Balsas', 'Formação inicial de 2 dias para a equipe nova.', '00000000-0000-4000-8000-000000000409', '2025-10-25', 'concluida', '2025-10-27T17:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000740', '00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000621', '00000000-0000-4000-8000-000000000313', 'Reciclagem técnica com simulado de campo', 'Segunda etapa da formação com casos práticos.', '00000000-0000-4000-8000-000000000409', '2026-08-20', 'planejada', null),
  ('00000000-0000-4000-8000-000000000741', '00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000622', '00000000-0000-4000-8000-000000000314', 'Diagnóstico do fluxo logístico de entregas em Palmas', 'Mapear gargalos do CD até o produtor.', '00000000-0000-4000-8000-000000000409', '2026-01-25', 'concluida', '2026-01-30T14:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000742', '00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000622', '00000000-0000-4000-8000-000000000314', 'Plano de ação com transportadora parceira', 'SLA de entrega e rota dedicada para janelas de aplicação.', '00000000-0000-4000-8000-000000000403', '2026-04-05', 'em_andamento', null),
  ('00000000-0000-4000-8000-000000000743', '00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000623', '00000000-0000-4000-8000-000000000313', 'Campanha de fungicidas com incentivo por positivação', 'Premiação por cliente novo positivado na linha.', '00000000-0000-4000-8000-000000000409', '2026-05-15', 'atrasada', null),
  ('00000000-0000-4000-8000-000000000744', '00000000-0000-4000-8000-000000000506', null, '00000000-0000-4000-8000-000000000314', 'Mapeamento de concorrência no Tocantins', 'Levantar portfólio, preços e ações dos concorrentes na praça.', '00000000-0000-4000-8000-000000000409', '2026-02-28', 'nao_feita', null),
  ('00000000-0000-4000-8000-000000000745', '00000000-0000-4000-8000-000000000506', null, '00000000-0000-4000-8000-000000000313', 'Encontro anual de planejamento com o canal', 'Fechamento da safra 2025/26 e desenho do plano 2026/27.', '00000000-0000-4000-8000-000000000403', '2026-08-25', 'planejada', null);

-- ─── Fotos de execução (exemplos) ───────────────────────────────────────────
insert into public.activity_photos (activity_id, storage_path, caption) values
  ('00000000-0000-4000-8000-000000000701', 'seed/treinamento-sorriso-01.jpg', 'Equipe de Sorriso durante o treinamento de fungicidas'),
  ('00000000-0000-4000-8000-000000000716', 'seed/assembleia-passo-fundo-01.jpg', 'Palestra do programa de fidelidade na assembleia'),
  ('00000000-0000-4000-8000-000000000739', 'seed/treinamento-balsas-01.jpg', 'Turma de vendedores de Balsas no treinamento de biológicos');
