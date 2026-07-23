"use server";

import { NOTES_MAX_BODY, NOTES_MAX_PINNED } from "@/lib/config";
import { getCurrentProfile, requireChannelAccess } from "@/lib/auth/scope";
import { revalidateNotePaths } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Actions das Notas do Canal.
 *
 * Regras de permissão (não há RLS — a validação vive aqui):
 * - ver/criar/fixar: qualquer pessoa com o canal no escopo
 * - editar/deletar: só o autor
 */

const GENERIC_ERROR = "Não foi possível salvar. Tente de novo.";

export async function createNote(input: {
  channelId: string;
  body: string;
  photoPath?: string | null;
}): Promise<ActionResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Escreva algo antes de publicar." };
  if (body.length > NOTES_MAX_BODY) {
    return { ok: false, error: "A nota ficou longa demais." };
  }

  const profile = await requireChannelAccess(input.channelId);
  if (!profile) {
    return { ok: false, error: "Você não tem acesso a este canal." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("channel_notes").insert({
    channel_id: input.channelId,
    author_id: profile.id,
    body,
    photo_path: input.photoPath || null,
  });
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateNotePaths(input.channelId);
  return { ok: true };
}

export async function updateNote(input: {
  noteId: string;
  body: string;
}): Promise<ActionResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "A nota não pode ficar vazia." };
  if (body.length > NOTES_MAX_BODY) {
    return { ok: false, error: "A nota ficou longa demais." };
  }

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("channel_notes")
    .select("channel_id, author_id")
    .eq("id", input.noteId)
    .maybeSingle();
  if (!note) return { ok: false, error: "Nota não encontrada." };
  if (note.author_id !== profile.id) {
    return { ok: false, error: "Só quem escreveu pode editar esta nota." };
  }

  const { error } = await supabase
    .from("channel_notes")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", input.noteId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateNotePaths(note.channel_id);
  return { ok: true };
}

export async function deleteNote(input: {
  noteId: string;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("channel_notes")
    .select("channel_id, author_id, photo_path")
    .eq("id", input.noteId)
    .maybeSingle();
  if (!note) return { ok: false, error: "Nota não encontrada." };
  if (note.author_id !== profile.id) {
    return { ok: false, error: "Só quem escreveu pode apagar esta nota." };
  }

  // Tira o arquivo do bucket antes de perder a referência (fotos de
  // seed ficam — são compartilhadas).
  if (note.photo_path && !note.photo_path.startsWith("seed/")) {
    await supabase.storage.from("activity-photos").remove([note.photo_path]);
  }

  const { error } = await supabase
    .from("channel_notes")
    .delete()
    .eq("id", input.noteId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateNotePaths(note.channel_id);
  return { ok: true };
}

/**
 * Fixar/desafixar — liberado a qualquer pessoa do canal (não só ao
 * autor): fixar é curadoria coletiva do que importa naquele cliente.
 */
export async function toggleNotePin(input: {
  noteId: string;
  pinned: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("channel_notes")
    .select("channel_id")
    .eq("id", input.noteId)
    .maybeSingle();
  if (!note) return { ok: false, error: "Nota não encontrada." };

  const profile = await requireChannelAccess(note.channel_id);
  if (!profile) {
    return { ok: false, error: "Você não tem acesso a este canal." };
  }

  if (input.pinned) {
    const { count } = await supabase
      .from("channel_notes")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", note.channel_id)
      .eq("pinned", true);
    if ((count ?? 0) >= NOTES_MAX_PINNED) {
      return {
        ok: false,
        error: `Máximo de ${NOTES_MAX_PINNED} notas fixadas. Desafixe outra antes.`,
      };
    }
  }

  const { error } = await supabase
    .from("channel_notes")
    .update({
      pinned: input.pinned,
      pinned_at: input.pinned ? new Date().toISOString() : null,
    })
    .eq("id", input.noteId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateNotePaths(note.channel_id);
  return { ok: true };
}
