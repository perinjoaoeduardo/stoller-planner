import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { harvestLabel } from "@/lib/config";
import { PageShell } from "@/components/app/page-shell";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getInboxRegistros } from "@/lib/db/inbox";

import { InboxView } from "./inbox-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Envios do campo — Corteva PED",
};

/**
 * /caixa-de-entrada — tudo que o RTV mandou do campo.
 *
 * "Caixa de entrada" prometia novidade, como notificação; o que existe
 * aqui é um repositório dos ENVIOS da pessoa, esperando virar atividade.
 * A rota fica como está: renomear URL quebraria link salvo e não muda
 * nada para quem lê a tela.
 *
 * Não é uma fila que se esvazia: o que já virou atividade continua ali,
 * mostrando o que foi feito. O que ainda pede decisão vem primeiro e é
 * o que traz botão.
 *
 * Só RTV: a fila é do trabalho que a própria pessoa enviou. Gestor não
 * tem envio para triar.
 */
export default async function CaixaDeEntradaPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "RTV") notFound();

  const channelIds = await getScopedChannelIds(profile);
  const registros = await getInboxRegistros(profile, channelIds);

  return (
    <PageShell
      title="Envios do campo"
      description={`O que você mandou do campo na ${harvestLabel()}.`}
    >
      <InboxView registros={registros} />
    </PageShell>
  );
}
