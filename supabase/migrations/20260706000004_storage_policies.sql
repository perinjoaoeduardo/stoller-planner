-- Políticas de storage do bucket activity-photos.
-- Leitura já é pública (bucket public); aqui liberamos escrita para
-- usuários autenticados — a permissão fina (quem pode anexar em qual
-- atividade) é validada na camada de aplicação (canRegisterExecution).

create policy "authenticated upload activity photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'activity-photos');

create policy "authenticated update activity photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'activity-photos');

create policy "authenticated delete activity photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'activity-photos');
