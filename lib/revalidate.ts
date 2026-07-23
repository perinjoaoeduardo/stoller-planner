import { revalidatePath } from "next/cache";

/**
 * Revalidação centralizada pós-mutação.
 *
 * Antes cada server action mantinha a própria lista de revalidatePath —
 * e as listas divergiam (uma esquecia /meus-canais, outra
 * /minhas-atividades), gerando tela desatualizada. Revalidar a mais
 * custa quase nada; esquecer uma rota custa dado velho na tela.
 *
 * Rota nova que exiba atividades/canais entra AQUI, uma vez, e todas
 * as mutações passam a cobri-la.
 */
export function revalidateActivityPaths(
  channelId: string,
  activityId?: string
) {
  revalidatePath("/");
  revalidatePath("/minhas-atividades");
  revalidatePath("/calendario");
  revalidatePath("/pendencias");
  revalidatePath("/registrar");
  revalidatePath("/atividades");
  if (activityId) revalidatePath(`/atividades/${activityId}`);
  revalidatePath("/canais");
  revalidatePath(`/canais/${channelId}`);
  revalidatePath("/meus-canais");
  revalidatePath(`/meus-canais/${channelId}`);
}

/** Telas que exibem o mural de notas do canal. */
export function revalidateNotePaths(channelId: string) {
  revalidatePath(`/canais/${channelId}/notas`);
  revalidatePath(`/canais/${channelId}`);
  revalidatePath(`/meus-canais/${channelId}`);
}
