import type { CurrentProfile } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

/**
 * Dados da tela de Configurações: os vínculos (user_links) que definem
 * o que o usuário enxerga. Somente leitura — vínculo é gerido pela
 * administração (CX).
 */

export type ChannelLink = {
  id: string;
  name: string;
  regionName: string;
  branchCount: number;
};

export type BranchLink = {
  id: string;
  name: string;
  city: string;
  channelName: string;
};

export type UserLinksSummary =
  | { kind: "all" }
  | { kind: "channels"; channels: ChannelLink[] }
  | { kind: "branches"; branches: BranchLink[] };

export async function getUserLinksSummary(
  profile: CurrentProfile
): Promise<UserLinksSummary> {
  if (profile.role === "CX") return { kind: "all" };

  const supabase = await createClient();

  if (profile.role === "DSM") {
    const { data, error } = await supabase
      .from("user_links")
      .select(
        "channel:channels(id, name, region:regions(name), branches(id))"
      )
      .eq("profile_id", profile.id)
      .not("channel_id", "is", null);
    if (error) throw error;

    const channels = data
      .map((link) => link.channel)
      .filter((channel): channel is NonNullable<typeof channel> => !!channel)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        regionName: channel.region?.name ?? "—",
        branchCount: channel.branches.length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { kind: "channels", channels };
  }

  // RTV / RDC — filiais vinculadas
  const { data, error } = await supabase
    .from("user_links")
    .select("branch:branches(id, name, city, channel:channels(name))")
    .eq("profile_id", profile.id)
    .not("branch_id", "is", null);
  if (error) throw error;

  const branches = data
    .map((link) => link.branch)
    .filter((branch): branch is NonNullable<typeof branch> => !!branch)
    .map((branch) => ({
      id: branch.id,
      name: branch.name,
      city: branch.city,
      channelName: branch.channel?.name ?? "—",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { kind: "branches", branches };
}
