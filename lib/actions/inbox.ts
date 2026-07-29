"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { ACTIVITY_CATEGORIES } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Actions da caixa de entrada.
 *
 * Nesta entrega existe só a inserção — a triagem (vincular, criar
 * atividade, descartar) é o prompt 2. A permissão vive aqui, como no
 * resto do app; a RLS da tabela é a segunda trava, para o dia em que um
 * webhook escrever direto.
 */

const GENERIC_ERROR = "Não foi possível salvar. Tente de novo.";

export async function criarRegistroInbox(input: {
  canalId: string;
  filialId?: string | null;
  fotos: string[];
  tipoAcao?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  metaId?: string | null;
}): Promise<ActionResult> {
  if (input.fotos.length === 0) {
    return { ok: false, error: "Anexe pelo menos uma foto." };
  }

  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(input.canalId)) {
    return { ok: false, error: "Você não tem acesso a este canal." };
  }

  const tipoAcao =
    input.tipoAcao &&
    (ACTIVITY_CATEGORIES as readonly string[]).includes(input.tipoAcao)
      ? input.tipoAcao
      : null;

  const supabase = await createClient();
  const { error } = await supabase.from("inbox_registros").insert({
    autor_id: profile.id,
    canal_id: input.canalId,
    filial_id: input.filialId || null,
    fotos: input.fotos,
    origem: "whatsapp",
    tipo_acao: tipoAcao,
    titulo: input.titulo?.trim() || null,
    descricao: input.descricao?.trim() || null,
    meta_id: input.metaId || null,
  });

  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePath("/caixa-de-entrada");
  // O badge do menu e a linha do Início vivem no layout e na home.
  revalidatePath("/", "layout");
  return { ok: true };
}
