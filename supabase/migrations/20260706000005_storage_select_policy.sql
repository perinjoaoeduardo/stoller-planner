-- O storage.remove() do Supabase exige SELECT além de DELETE nas linhas
-- de storage.objects — sem isso a exclusão de arquivos falha em silêncio.

create policy "authenticated read activity photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'activity-photos');
