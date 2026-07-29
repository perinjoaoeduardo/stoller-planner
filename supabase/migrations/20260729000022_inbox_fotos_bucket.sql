-- Bucket das fotos da caixa de entrada.
--
-- PRIVADO, ao contrário de activity-photos (público). A diferença tem
-- razão: a foto do inbox chega de fora do app, por um canal que não
-- controlamos, e fica numa fila de triagem — pode conter coisa que
-- ninguém revisou ainda. Leitura por URL assinada, gerada no servidor.
--
-- O padrão de CAMINHO e o pipeline (compressão, tipos aceitos, limite)
-- continuam sendo os de lib/photos.ts. Só a forma de servir muda, e ela
-- mora no mesmo módulo — não há um segundo lugar no app que monte URL
-- de foto.

insert into storage.buckets (id, name, public)
values ('inbox-fotos', 'inbox-fotos', false)
on conflict (id) do nothing;

create policy "authenticated read inbox fotos"
  on storage.objects for select to authenticated
  using (bucket_id = 'inbox-fotos');

create policy "authenticated upload inbox fotos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'inbox-fotos');

create policy "authenticated update inbox fotos"
  on storage.objects for update to authenticated
  using (bucket_id = 'inbox-fotos');

create policy "authenticated delete inbox fotos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'inbox-fotos');
