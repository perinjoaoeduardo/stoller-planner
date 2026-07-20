import type { Metadata } from "next";

import { PageShell } from "@/components/app/page-shell";
import { PendenciasView } from "@/components/app/pendencias-view";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getPendencies } from "@/lib/db/pendencias";
import { isPendencyType } from "@/lib/pendencias-shared";

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
export default async function PendenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const profile = await getCurrentProfile();

  const [channelIds, params] = await Promise.all([
    getScopedChannelIds(profile),
    searchParams,
  ]);
  const pendencies = await getPendencies(channelIds);
  const rawTipo = params.tipo ?? null;
  const activeFilter = isPendencyType(rawTipo) ? rawTipo : null;

  return (
    <PageShell
      title="Pendências"
      description="Registros crus do campo que precisam de um acabamento: foto, vínculo com meta ou categoria. Clique para resolver."
    >
      <PendenciasView
        data={pendencies}
        showDsm={profile.role === "CX"}
        activeFilter={activeFilter}
      />
    </PageShell>
  );
}
