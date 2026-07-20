import type { Role } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados das Notas do Canal.
 * Feed livre por canal — quem tem acesso ao canal vê tudo; o recorte de
 * escopo é responsabilidade do chamador (getScopedChannelIds), igual ao
 * resto do projeto.
 */

/** Limite de notas fixadas por canal (soft cap validado na action). */
export const MAX_PINNED_NOTES = 5;

export type ChannelNote = {
  id: string;
  body: string;
  photoPath: string | null;
  pinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** True quando a nota foi editada depois de criada. */
  edited: boolean;
  author: { id: string; name: string; role: Role; avatarUrl: string | null };
};

/** Notas do canal: fixadas primeiro (última fixada no topo), depois o
 *  feed cronológico reverso. */
export async function getChannelNotes(
  channelId: string
): Promise<ChannelNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channel_notes")
    .select(
      `id, body, photo_path, pinned, pinned_at, created_at, updated_at,
       author:profiles(id, full_name, role, avatar_url)`
    )
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const notes: ChannelNote[] = data.map((note) => ({
    id: note.id,
    body: note.body,
    photoPath: note.photo_path,
    pinned: note.pinned,
    pinnedAt: note.pinned_at,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    // Tolera micro-diferenças de timestamp na criação (o default de
    // updated_at pode sair alguns ms depois do created_at).
    edited:
      new Date(note.updated_at).getTime() -
        new Date(note.created_at).getTime() >
      1000,
    author: {
      id: note.author?.id ?? "",
      name: note.author?.full_name ?? "—",
      role: (note.author?.role ?? "RTV") as Role,
      avatarUrl: note.author?.avatar_url ?? null,
    },
  }));

  // Fixadas primeiro, por data de fixação desc; o resto por criação desc
  // (a query já devolve nessa ordem).
  return [
    ...notes
      .filter((note) => note.pinned)
      .sort((a, b) => (a.pinnedAt ?? "") < (b.pinnedAt ?? "") ? 1 : -1),
    ...notes.filter((note) => !note.pinned),
  ];
}

/** Contador do botão "Notas (N)" no header do canal. */
export async function getChannelNoteCount(channelId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("channel_notes")
    .select("id", { count: "exact", head: true })
    .eq("channel_id", channelId);

  if (error) throw error;
  return count ?? 0;
}
