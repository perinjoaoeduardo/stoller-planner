-- Cada registro precisa do SEU arquivo, não de um emprestado.
--
-- O seed do RTV (migração 24) reaproveitou caminhos de foto que o seed
-- geral (migração 23) já usava. Como a triagem MOVE a foto do bucket da
-- caixa para o de evidência — apagando a origem —, resolver um registro
-- deixava o outro apontando para um arquivo que não existe mais, e o
-- segundo dava erro na hora de registrar.
--
-- Aqui os registros do Bruno passam a ter caminhos próprios. Os arquivos
-- correspondentes são gerados por `scripts/seed-demo-photos.ts`.

update public.inbox_registros
set fotos = array['inbox/rtv-treinamento-a.jpg']
where id = '00000000-0000-4000-8000-000000000931';

update public.inbox_registros
set fotos = array['inbox/rtv-treinamento-b.jpg']
where id = '00000000-0000-4000-8000-000000000932';

update public.inbox_registros
set fotos = array['inbox/rtv-treinamento-c.jpg']
where id = '00000000-0000-4000-8000-000000000933';

update public.inbox_registros
set fotos = array['inbox/rtv-passo-fundo-a.jpg', 'inbox/rtv-passo-fundo-b.jpg',
                  'inbox/rtv-passo-fundo-c.jpg', 'inbox/rtv-passo-fundo-d.jpg']
where id = '00000000-0000-4000-8000-000000000934';

update public.inbox_registros
set fotos = array['inbox/rtv-terra-boa-a.jpg', 'inbox/rtv-sementes-a.jpg']
where id = '00000000-0000-4000-8000-000000000935';
