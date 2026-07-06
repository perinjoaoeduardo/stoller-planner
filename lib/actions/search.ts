"use server";

import {
  getCurrentProfile,
  getScopedBranchIds,
  getScopedChannelIds,
} from "@/lib/auth/scope";
import { searchAll, type GlobalSearchResults } from "@/lib/db/search";

const EMPTY: GlobalSearchResults = {
  activities: [],
  channels: [],
  branches: [],
  problems: [],
  people: [],
  regions: [],
};

/**
 * Busca global do command palette (Ctrl+K), escopada por perfil.
 * Query com menos de 2 caracteres retorna vazio para evitar ruído.
 */
export async function searchGlobal(
  query: string
): Promise<GlobalSearchResults> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return EMPTY;

  const profile = await getCurrentProfile();
  const [channelIds, branchIds] = await Promise.all([
    getScopedChannelIds(profile),
    getScopedBranchIds(profile),
  ]);

  return searchAll(profile, { channelIds, branchIds }, trimmed);
}
