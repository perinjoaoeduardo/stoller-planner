-- Seed do Bloco 6: canal vitrine para a demo (AgroVale Distribuidora).
--
-- Objetivo: o Relatório de Safra da AgroVale precisa contar uma história
-- completa — 5 problemas, 13+ atividades bem distribuídas na safra
-- 2025/26, maioria concluída com descrições de execução realistas,
-- galeria de fotos populada e registros espalhados pelos meses.
--
-- Também limpa os resíduos de testes manuais dos blocos anteriores
-- (fotos aleatórias e status trocados) SEM tocar nos canais Terra Boa e
-- Plantar, que ficam "no escuro" de propósito para a demo do CX.

-- ─── Limpeza de resíduos de teste (somente plano AgroVale) ─────────────────
-- Fotos de teste (fora do padrão seed/) e eventos de execução de teste
-- das atividades de ID fixo. A atividade avulsa criada em teste
-- ("Visita de emergência...") é mantida: vira exemplo real de ação fora
-- do plano inicial.
delete from public.activity_photos
where storage_path not like 'seed/%'
  and activity_id in (
    select id from public.activities
    where plan_id = '00000000-0000-4000-8000-000000000501'
      and id::text like '00000000-0000-4000-8000-%'
  );

delete from public.activity_events
where type = 'execucao_registrada'
  and activity_id in (
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000702',
    '00000000-0000-4000-8000-000000000703',
    '00000000-0000-4000-8000-000000000704',
    '00000000-0000-4000-8000-000000000705',
    '00000000-0000-4000-8000-000000000706',
    '00000000-0000-4000-8000-000000000707',
    '00000000-0000-4000-8000-000000000708'
  );

-- ─── Ajuste de status para a narrativa da safra ─────────────────────────────
-- 706: recuperação do cliente-chave CONCLUÍDA (com leve atraso — realista).
update public.activities
set status = 'concluida', completed_at = '2026-02-27T18:00:00-03:00'
where id = '00000000-0000-4000-8000-000000000706';

-- 708: reunião de metas volta a ser futura (ago/2026).
update public.activities
set status = 'planejada', completed_at = null
where id = '00000000-0000-4000-8000-000000000708';

-- 705: campanha de mix segue pendente com prazo vencido (exibe Atrasada).
update public.activities
set status = 'em_andamento', completed_at = null
where id = '00000000-0000-4000-8000-000000000705';

-- ─── 5º problema do plano vitrine ───────────────────────────────────────────
insert into public.problems (id, plan_id, title, description, order_index) values
  ('00000000-0000-4000-8000-000000000631', '00000000-0000-4000-8000-000000000501',
   'Baixa adesão ao programa de fidelidade no canal',
   'Apenas 15% dos clientes ativos aderiram ao programa; a equipe não usa o benefício como argumento de venda.', 4);

-- ─── Novas atividades (todas concluídas, espalhadas pela safra) ─────────────
insert into public.activities (id, plan_id, problem_id, branch_id, title, description, responsible_id, due_date, status, completed_at) values
  ('00000000-0000-4000-8000-000000000771', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000303',
   'Campanha de fungicidas premium com metas semanais',
   'Campanha de sell-out com metas semanais por vendedor e premiação por positivação de fungicidas premium.',
   '00000000-0000-4000-8000-000000000404', '2026-01-20', 'concluida', '2026-01-18T16:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000772', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000301',
   'Reciclagem de biológicos para o balcão — turma 2',
   'Segunda turma do treinamento, cobrindo os balconistas contratados na entressafra.',
   '00000000-0000-4000-8000-000000000404', '2026-03-05', 'concluida', '2026-03-06T15:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000773', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000302',
   'Análise de mix por cliente com oferta casada',
   'Cruzamento do faturamento por SKU e desenho de ofertas casadas para diversificar o mix dos 35 maiores clientes.',
   '00000000-0000-4000-8000-000000000401', '2026-02-25', 'concluida', '2026-02-24T11:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000774', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000631', '00000000-0000-4000-8000-000000000303',
   'Lançamento do programa de fidelidade na convenção do canal',
   'Apresentação do programa e das faixas de benefício na convenção anual de vendas da AgroVale.',
   '00000000-0000-4000-8000-000000000401', '2025-10-30', 'concluida', '2025-10-30T18:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000775', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000631', '00000000-0000-4000-8000-000000000301',
   'Acompanhamento trimestral de adesão ao programa',
   'Revisão de adesão por vendedor e plano de reforço com os de menor conversão.',
   '00000000-0000-4000-8000-000000000404', '2026-06-20', 'concluida', '2026-06-22T09:30:00-03:00');

-- ─── Registros de execução curados (pulsação mês a mês) ─────────────────────
insert into public.activity_events (activity_id, profile_id, type, description, created_at) values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000404', 'execucao_registrada',
   'Treinamento realizado com 14 vendedores de Sorriso; avaliação média 9,2 e argumentário de fungicidas entregue impresso.',
   '2025-09-14T17:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000774', '00000000-0000-4000-8000-000000000401', 'execucao_registrada',
   'Programa de fidelidade lançado na convenção anual: 62 clientes inscritos no primeiro dia e material entregue às 3 filiais.',
   '2025-10-30T21:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000404', 'execucao_registrada',
   'Dia de campo com 40 produtores; talhão demonstrativo apresentou +8 sc/ha vs testemunha e gerou 12 pedidos na semana.',
   '2025-11-22T13:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000771', '00000000-0000-4000-8000-000000000404', 'execucao_registrada',
   'Campanha encerrada com 118% da meta de fungicidas premium no trimestre; share em Sorriso subiu de 11% para 15%.',
   '2026-01-18T19:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000401', 'execucao_registrada',
   'Visitas conjuntas com o agrônomo Stoller em 3 clientes de Rio Verde; 2 pedidos de biológicos fechados na própria semana.',
   '2026-02-12T20:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000773', '00000000-0000-4000-8000-000000000401', 'execucao_registrada',
   'Análise de mix entregue à gerência: 35 clientes com potencial de +2 linhas; ofertas casadas definidas para o Q2.',
   '2026-02-24T14:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000706', '00000000-0000-4000-8000-000000000401', 'execucao_registrada',
   'Plano de recuperação concluído: proposta aceita pelos sócios da Fazenda Santa Luzia com pedido de 60% do volume histórico.',
   '2026-02-27T18:00:00-03:00'),
  ('00000000-0000-4000-8000-000000000772', '00000000-0000-4000-8000-000000000404', 'execucao_registrada',
   'Turma 2 formada: 9 balconistas de Rio Verde certificados na linha de biológicos com prova prática.',
   '2026-03-06T18:30:00-03:00'),
  ('00000000-0000-4000-8000-000000000775', '00000000-0000-4000-8000-000000000404', 'execucao_registrada',
   'Adesão ao programa chegou a 41% dos clientes ativos; próxima revisão marcada para setembro.',
   '2026-06-22T12:45:00-03:00'),
  ('00000000-0000-4000-8000-000000000705', '00000000-0000-4000-8000-000000000404', 'execucao_registrada',
   'Parcial da campanha de mix: 3 dos 5 vendedores de Rondonópolis atingiram o mix mínimo; bonificação reforçada para o fechamento.',
   now() - interval '2 days');

-- ─── Fotos da galeria do relatório (arquivos sobem via script) ──────────────
insert into public.activity_photos (activity_id, storage_path, caption, created_at) values
  ('00000000-0000-4000-8000-000000000702', 'seed/dia-campo-sorriso-01.jpg', 'Talhão demonstrativo de fungicida em soja — Sorriso', '2025-11-22T13:35:00-03:00'),
  ('00000000-0000-4000-8000-000000000702', 'seed/dia-campo-sorriso-02.jpg', 'Produtores acompanhando a demonstração no dia de campo', '2025-11-22T13:40:00-03:00'),
  ('00000000-0000-4000-8000-000000000704', 'seed/visita-tecnica-rio-verde-01.jpg', 'Visita técnica conjunta com agrônomo Stoller — Rio Verde', '2026-02-12T20:35:00-03:00'),
  ('00000000-0000-4000-8000-000000000706', 'seed/reuniao-santa-luzia-01.jpg', 'Reunião de fechamento com os sócios da Fazenda Santa Luzia', '2026-02-27T18:05:00-03:00'),
  ('00000000-0000-4000-8000-000000000771', 'seed/campanha-fungicidas-01.jpg', 'Equipe de Sorriso na largada da campanha de fungicidas', '2026-01-18T19:35:00-03:00'),
  ('00000000-0000-4000-8000-000000000772', 'seed/treinamento-rio-verde-01.jpg', 'Turma 2 do treinamento de biológicos — Rio Verde', '2026-03-06T18:35:00-03:00'),
  ('00000000-0000-4000-8000-000000000773', 'seed/analise-mix-rondonopolis-01.jpg', 'Workshop de análise de mix com a gerência do canal', '2026-02-24T14:35:00-03:00'),
  ('00000000-0000-4000-8000-000000000774', 'seed/convencao-fidelidade-01.jpg', 'Lançamento do programa de fidelidade na convenção', '2025-10-30T21:35:00-03:00'),
  ('00000000-0000-4000-8000-000000000774', 'seed/convencao-fidelidade-02.jpg', 'Equipe comercial da AgroVale na convenção anual', '2025-10-30T21:40:00-03:00'),
  ('00000000-0000-4000-8000-000000000775', 'seed/fidelidade-revisao-01.jpg', 'Revisão trimestral de adesão ao programa de fidelidade', '2026-06-22T12:50:00-03:00');
