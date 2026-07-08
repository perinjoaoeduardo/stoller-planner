import type { Metadata } from "next";

import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getChannelCards } from "@/lib/db/channels";

import { MeusCanaisView } from "./meus-canais-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus Canais — Corteva Planner",
};

/**
 * "Meus Canais" do RTV — server component minimo que busca os canais no
 * escopo do usuario e delega a UI (grid + filtro de regiao) para o
 * client component MeusCanaisView.
 */
export default async function MeusCanaisPage() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const channels = await getChannelCards(channelIds);

  return <MeusCanaisView channels={channels} />;
}
