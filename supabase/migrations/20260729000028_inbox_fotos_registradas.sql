-- Registro já resolvido tinha perdido a própria foto.
--
-- A triagem MOVE o arquivo do bucket da caixa (`inbox-fotos`) para o de
-- evidência (`activity-photos`), mas o registro continuava apontando para
-- o caminho antigo. Enquanto ele sumia da tela ao ser resolvido isso não
-- aparecia; agora que o registro FICA no feed mostrando o que foi feito,
-- ele aparecia com a imagem quebrada.
--
-- Aqui os registros já resolvidos passam a apontar para onde a foto
-- realmente está: a evidência da atividade que eles viraram.

update public.inbox_registros as r
set fotos = evidencia.caminhos
from (
  select p.activity_id, array_agg(p.storage_path order by p.created_at) as caminhos
  from public.activity_photos as p
  group by p.activity_id
) as evidencia
where r.status = 'registrado'
  and r.atividade_id = evidencia.activity_id
  -- Só quem ainda aponta para o bucket da caixa: quem já foi corrigido
  -- não pode ser mexido de novo.
  and exists (select 1 from unnest(r.fotos) as f where f like 'inbox/%');
