-- Políticas de storage do bucket avatars (fotos de perfil).
-- Leitura é pública (bucket public); escrita para autenticados —
-- cada usuário gerencia o próprio avatar pela camada de aplicação.

create policy "authenticated upload avatars"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "authenticated update avatars"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars');

create policy "authenticated delete avatars"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars');

create policy "authenticated read avatars"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
