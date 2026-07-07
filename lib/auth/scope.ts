import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/nav";

export type { Role };

/**
 * CAMADA DE PERMISSÕES DO PROTÓTIPO
 * =================================
 * Regra de ouro: cada usuário só enxerga e governa aquilo a que está
 * vinculado (user_links). CX enxerga tudo.
 *
 * Escopos de VISÃO:
 * - CX  → todas as regiões, canais, filiais e planos
 * - DSM → os canais linkados a ele (e tudo dentro deles)
 * - RTV → as filiais linkadas a ele (vê o plano do canal-pai)
 * - RDC → mesmo modelo do RTV
 *
 * Regras de ESCRITA (aplicar em toda tela de mutação):
 * - Criar/editar/excluir problemas e atividades do plano:
 *   DSM (nos seus canais) e CX → canEditPlan()
 * - Registrar execução (status + foto + descrição):
 *   RTV/RDC responsáveis ou linkados à filial da atividade,
 *   DSM do canal e CX → canRegisterExecution()
 * - Gerenciar estrutura (regiões, canais, filiais, usuários): só CX
 *   (telas em bloco futuro)
 *
 * TODAS as queries de dados de telas internas devem filtrar por
 * getScopedChannelIds()/getScopedBranchIds(). Sem RLS neste protótipo:
 * a segurança é esta camada de aplicação. RLS entra quando o produto
 * for a produção.
 */

export type CurrentProfile = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
};

/**
 * Profile + role do usuário logado, cacheado por request (React cache).
 * Redireciona para /login se não houver sessão ou profile vinculado.
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile) redirect("/login");

  return {
    id: profile.id,
    userId: user.id,
    fullName: profile.full_name,
    email: user.email ?? "",
    role: profile.role as Role,
    avatarUrl: profile.avatar_url,
  };
});

/**
 * Guarda de servidor das rotas exclusivas do CX (/visao-geral, /regioes,
 * /acompanhamento): outros perfis recebem o 404 amigável do app.
 */
export async function requireCx(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "CX") notFound();
  return profile;
}

/**
 * Canais visíveis para o usuário:
 * - CX → todos
 * - DSM → canais dos seus user_links
 * - RTV/RDC → canais-pai das filiais linkadas
 */
export const getScopedChannelIds = cache(
  async (profile: CurrentProfile): Promise<string[]> => {
    const supabase = await createClient();

    if (profile.role === "CX") {
      const { data, error } = await supabase.from("channels").select("id");
      if (error) throw error;
      return data.map((channel) => channel.id);
    }

    if (profile.role === "DSM") {
      const { data, error } = await supabase
        .from("user_links")
        .select("channel_id")
        .eq("profile_id", profile.id)
        .not("channel_id", "is", null);
      if (error) throw error;
      return [...new Set(data.map((link) => link.channel_id!))];
    }

    // RTV / RDC: canais-pai das filiais linkadas
    const { data, error } = await supabase
      .from("user_links")
      .select("branch:branches(channel_id)")
      .eq("profile_id", profile.id)
      .not("branch_id", "is", null);
    if (error) throw error;
    return [
      ...new Set(
        data
          .map((link) => link.branch?.channel_id)
          .filter((id): id is string => !!id)
      ),
    ];
  }
);

/**
 * Filiais visíveis para o usuário:
 * - CX → todas
 * - DSM → todas as filiais dos canais linkados
 * - RTV/RDC → filiais dos seus user_links
 */
export const getScopedBranchIds = cache(
  async (profile: CurrentProfile): Promise<string[]> => {
    const supabase = await createClient();

    if (profile.role === "CX") {
      const { data, error } = await supabase.from("branches").select("id");
      if (error) throw error;
      return data.map((branch) => branch.id);
    }

    if (profile.role === "DSM") {
      const channelIds = await getScopedChannelIds(profile);
      if (channelIds.length === 0) return [];
      const { data, error } = await supabase
        .from("branches")
        .select("id")
        .in("channel_id", channelIds);
      if (error) throw error;
      return data.map((branch) => branch.id);
    }

    const { data, error } = await supabase
      .from("user_links")
      .select("branch_id")
      .eq("profile_id", profile.id)
      .not("branch_id", "is", null);
    if (error) throw error;
    return [...new Set(data.map((link) => link.branch_id!))];
  }
);

/**
 * DSM linkado ao canal e CX podem editar plano/problemas/atividades.
 * RTV/RDC não editam plano.
 */
export async function canEditPlan(
  profile: CurrentProfile,
  channelId: string
): Promise<boolean> {
  if (profile.role === "CX") return true;
  if (profile.role !== "DSM") return false;
  const channelIds = await getScopedChannelIds(profile);
  return channelIds.includes(channelId);
}

export type ActivityForPermission = {
  /** Id da atividade — quando presente, assignees também contam. */
  id?: string;
  responsible_id: string | null;
  branch_id: string | null;
  /** Canal do plano da atividade (plan.channel_id). */
  channel_id: string;
};

/**
 * Quem pode registrar execução (status + foto + descrição) de uma
 * atividade: RTV/RDC responsáveis (responsible_id legado OU
 * activity_assignees) ou linkados à filial da atividade, DSM do canal
 * e CX.
 */
export async function canRegisterExecution(
  profile: CurrentProfile,
  activity: ActivityForPermission
): Promise<boolean> {
  if (profile.role === "CX") return true;

  if (profile.role === "DSM") {
    const channelIds = await getScopedChannelIds(profile);
    return channelIds.includes(activity.channel_id);
  }

  // RTV / RDC
  if (activity.responsible_id === profile.id) return true;
  if (activity.id) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("activity_assignees")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activity.id)
      .eq("profile_id", profile.id);
    if ((count ?? 0) > 0) return true;
  }
  if (!activity.branch_id) return false;
  const branchIds = await getScopedBranchIds(profile);
  return branchIds.includes(activity.branch_id);
}
