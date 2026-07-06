-- Stoller Planner — novos tipos de evento do Bloco 4
-- 'execucao_registrada': registro de execução em campo (fluxo /registrar)
-- 'reaberta': atividade concluída voltou para em andamento

alter table public.activity_events
  drop constraint activity_events_type_check;

alter table public.activity_events
  add constraint activity_events_type_check check (
    type in (
      'criada',
      'editada',
      'status_alterado',
      'foto_adicionada',
      'foto_removida',
      'execucao_registrada',
      'reaberta'
    )
  );
