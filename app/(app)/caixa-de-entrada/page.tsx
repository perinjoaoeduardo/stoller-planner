import type { Metadata } from "next";
import { harvestLabel } from "@/lib/config";

import { PageShell } from "@/components/app/page-shell";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getInboxCanais, getInboxPendentes } from "@/lib/db/inbox";

import { InboxView } from "./inbox-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Caixa de entrada — Corteva PED",
};

/**
 * /caixa-de-entrada — a fila do que chegou do campo e ainda não virou
 * atividade.
 *
 * Modelo mental de caixa de entrada, não de pasta: nada aqui é para
 * guardar, tudo é para resolver, e o estado bom é vazio. Esta entrega
 * cobre só a leitura — as ações de triagem vêm depois.
 */
export default async function CaixaDeEntradaPage({
  searchParams,
}: {
  searchParams: Promise<{ canal?: string; origem?: string; todos?: string }>;
}) {
  const [profile, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);
  const channelIds = await getScopedChannelIds(profile);

  // Só quem enxerga o trabalho de outras pessoas pode alternar o escopo.
  const podeVerDeTodos = profile.role === "DSM" || profile.role === "CX";
  const verDeTodos = podeVerDeTodos && params.todos === "1";

  const [grupos, canais] = await Promise.all([
    getInboxPendentes(profile, channelIds, {
      verDeTodos,
      canalId: params.canal ?? null,
      origem: params.origem ?? null,
    }),
    getInboxCanais(channelIds),
  ]);

  const total = grupos.reduce((soma, grupo) => soma + grupo.registros.length, 0);

  return (
    <PageShell
      title="Caixa de entrada"
      description={`Registros que chegaram do campo na ${harvestLabel()} e ainda não viraram atividade.`}
    >
      <InboxView
        grupos={grupos}
        canais={canais}
        totalRegistros={total}
        podeVerDeTodos={podeVerDeTodos}
        verDeTodos={verDeTodos}
        canalFiltro={params.canal ?? null}
      />
    </PageShell>
  );
}
