import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/app/page-shell";
import { PendenciasView } from "@/components/app/pendencias-view";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getPendencies } from "@/lib/db/pendencias";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pendências — Corteva Planner",
};

/**
 * /pendencias — a camada de faxina do DSM.
 *
 * DECISÃO: página própria na navegação do DSM (não aba). A faxina é um
 * ritual separado do dia a dia de execução — o DSM senta, resolve a
 * fila e sai. Uma página dedicada dá deep link, badge de navegação no
 * futuro e não polui o cockpit do canal. O CX usa a mesma visão como
 * aba do /acompanhamento, junto das outras ferramentas de cobrança.
 *
 * Escopo: DSM vê seus canais; CX (se acessar direto) vê tudo.
 */
export default async function PendenciasPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "DSM" && profile.role !== "CX") notFound();

  const channelIds = await getScopedChannelIds(profile);
  const pendencies = await getPendencies(channelIds);

  return (
    <PageShell
      title="Pendências"
      description="Registros crus do campo que precisam de um acabamento: foto, vínculo com meta ou categoria. Clique para resolver."
    >
      <PendenciasView data={pendencies} showDsm={profile.role === "CX"} />
    </PageShell>
  );
}
