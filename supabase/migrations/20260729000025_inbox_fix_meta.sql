-- Correção de dado do seed: o registro completo do Bruno apontava para
-- uma meta do plano do Campo Forte, não da Terra Boa. Meta de um canal
-- não pode aparecer num registro de outro — na triagem isso viraria
-- atividade vinculada à meta errada.
update public.inbox_registros
   set meta_id = '00000000-0000-4000-8000-000000000617'
 where id = '00000000-0000-4000-8000-000000000935';
