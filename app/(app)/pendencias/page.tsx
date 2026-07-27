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
  searchParams: Promise<{
    tipo?: string;
    escopo?: string;
    canal?: string;
    pessoa?: string;
  }>;
}) {
  const profile = await getCurrentProfile();

  const [channelIds, params] = await Promise.all([
    getScopedChannelIds(profile),
    searchParams,
  ]);
  // O RTV só vê (e resolve) as pendências das PRÓPRIAS atividades; DSM/CX
  // veem tudo no escopo. Mostrar ao RTV as pendências de outras pessoas
  // seria ruído inacionável.
  const isField = profile.role === "RTV";
  // DSM/CX podem estreitar para "só minhas" — é como a home entra quando
  // o gestor clica em "Minhas pendências": o número prometido no card
  // tem que ser a lista que abre.
  const onlyMine = isField || params.escopo === "minhas";
  const pendencies = await getPendencies(
    channelIds,
    onlyMine ? profile.id : undefined
  );
  const rawTipo = params.tipo ?? null;
  const activeFilter = isPendencyType(rawTipo) ? rawTipo : null;

  return (
    <PageShell
      title="Pendências"
      description={
        isField
          ? "Seus registros que precisam de um acabamento: foto, vínculo com meta ou categoria. Toque para resolver."
          : "Registros crus do campo que precisam de um acabamento: foto, vínculo com meta ou categoria. Clique para resolver."
      }
    >
      <PendenciasView
        data={pendencies}
        showDsm={profile.role === "CX"}
        activeFilter={activeFilter}
        onlyMine={onlyMine}
        canToggleScope={!isField}
        channelFilter={params.canal ?? null}
        personFilter={params.pessoa ?? null}
      />
    </PageShell>
  );
}
