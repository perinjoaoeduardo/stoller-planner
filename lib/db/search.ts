import type { ActivityStatus } from "@/components/app/status-badge";
import type { CurrentProfile } from "@/lib/auth/scope";
import { getDisplayStatus } from "@/lib/db/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de dados da busca global (Ctrl+K).
 * Toda query respeita o escopo do perfil: os ids de canal/filial chegam
 * já filtrados pela camada lib/auth/scope — nunca consulte fora deles.
 */

export type SearchActivityHit = {
  id: string;
  title: string;
  status: ActivityStatus;
  dueDate: string | null;
  channelName: string;
  branchName: string | null;
};

export type SearchChannelHit = {
  id: string;
  name: string;
  regionName: string;
};

export type SearchBranchHit = {
  id: string;
  name: string;
  city: string;
  channelId: string;
  channelName: string;
};

export type SearchProblemHit = {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
};

export type SearchPersonHit = {
  id: string;
  name: string;
  role: string;
};

export type SearchRegionHit = {
  id: string;
  name: string;
};

export type GlobalSearchResults = {
  activities: SearchActivityHit[];
  channels: SearchChannelHit[];
  branches: SearchBranchHit[];
  problems: SearchProblemHit[];
  people: SearchPersonHit[];
  regions: SearchRegionHit[];
};

/** Escapa curingas do ilike para a busca ser literal. */
function toPattern(query: string): string {
  return `%${query.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
}

export async function searchAll(
  profile: CurrentProfile,
  scope: { channelIds: string[]; branchIds: string[] },
  query: string
): Promise<GlobalSearchResults> {
  const supabase = await createClient();
  const pattern = toPattern(query.trim());
  const { channelIds, branchIds } = scope;
  const isField = profile.role === "RTV" || profile.role === "RDC";
  const isManager = profile.role === "DSM" || profile.role === "CX";

  // ── Atividades (título) no plano ativo dos canais do escopo ──────────
  let activitiesQuery = supabase
    .from("activities")
    .select(
      `id, title, status, due_date,
       branch:branches(name),
       plan:plans!inner(status, channel_id, channel:channels(name))`
    )
    .ilike("title", pattern)
    .eq("plan.status", "ativo")
    .in("plan.channel_id", channelIds.length > 0 ? channelIds : ["-"])
    .limit(6);

  // RTV/RDC: só o que é da filial dele ou dele como responsável.
  if (isField) {
    const orParts = [`responsible_id.eq.${profile.id}`];
    if (branchIds.length > 0) {
      orParts.push(`branch_id.in.(${branchIds.join(",")})`);
    }
    activitiesQuery = activitiesQuery.or(orParts.join(","));
  }

  const [activitiesRes, channelsRes, branchesRes, problemsRes, peopleRes, regionsRes] =
    await Promise.all([
      activitiesQuery,
      supabase
        .from("channels")
        .select("id, name, region:regions(name)")
        .ilike("name", pattern)
        .in("id", channelIds.length > 0 ? channelIds : ["-"])
        .limit(4),
      supabase
        .from("branches")
        .select("id, name, city, channel_id, channel:channels(name)")
        .or(`name.ilike.${pattern},city.ilike.${pattern}`)
        .in("id", branchIds.length > 0 ? branchIds : ["-"])
        .limit(4),
      supabase
        .from("problems")
        .select(
          "id, title, plan:plans!inner(status, channel_id, channel:channels(name))"
        )
        .ilike("title", pattern)
        .eq("plan.status", "ativo")
        .in("plan.channel_id", channelIds.length > 0 ? channelIds : ["-"])
        .limit(4),
      isManager
        ? supabase
            .from("profiles")
            .select("id, full_name, role")
            .ilike("full_name", pattern)
            .limit(4)
        : Promise.resolve({ data: [], error: null }),
      profile.role === "CX"
        ? supabase
            .from("regions")
            .select("id, name")
            .ilike("name", pattern)
            .limit(3)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (activitiesRes.error) throw activitiesRes.error;
  if (channelsRes.error) throw channelsRes.error;
  if (branchesRes.error) throw branchesRes.error;
  if (problemsRes.error) throw problemsRes.error;
  if (peopleRes.error) throw peopleRes.error;
  if (regionsRes.error) throw regionsRes.error;

  return {
    activities: (activitiesRes.data ?? []).map((activity) => ({
      id: activity.id,
      title: activity.title,
      status: getDisplayStatus({
        status: activity.status as ActivityStatus,
        dueDate: activity.due_date,
      }),
      dueDate: activity.due_date,
      channelName: activity.plan?.channel?.name ?? "—",
      branchName: activity.branch?.name ?? null,
    })),
    channels: (channelsRes.data ?? []).map((channel) => ({
      id: channel.id,
      name: channel.name,
      regionName: channel.region?.name ?? "—",
    })),
    branches: (branchesRes.data ?? []).map((branch) => ({
      id: branch.id,
      name: branch.name,
      city: branch.city,
      channelId: branch.channel_id,
      channelName: branch.channel?.name ?? "—",
    })),
    problems: (problemsRes.data ?? []).map((problem) => ({
      id: problem.id,
      title: problem.title,
      channelId: problem.plan?.channel_id ?? "",
      channelName: problem.plan?.channel?.name ?? "—",
    })),
    people: (peopleRes.data ?? []).map((person) => ({
      id: person.id,
      name: person.full_name,
      role: person.role,
    })),
    regions: (regionsRes.data ?? []).map((region) => ({
      id: region.id,
      name: region.name,
    })),
  };
}
