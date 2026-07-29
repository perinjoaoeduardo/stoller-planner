"use client";

import * as React from "react";
import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { InboxRegistro } from "@/lib/db/inbox";

import { RegistrarDrawer } from "./registrar-drawer";
import { InboxCard } from "./inbox-card";
import { PhotoLightbox } from "./photo-lightbox";

/** Teto do que o feed mostra de uma vez. */
const MAX_VISIVEL = 40;

/**
 * Envios do campo — o feed do que o RTV mandou pelo WhatsApp.
 *
 * O que ainda PEDE DECISÃO vem primeiro; dentro de cada grupo, ordem de
 * chegada. NADA sai daqui: o resolvido assenta no lugar, com o tique
 * verde e o nome da atividade que virou, e o ladrilho inteiro passa a
 * levar até ela. Sumir com o que chegou do campo apagava a prova do
 * trabalho de alguém — e dava a impressão de que algo se perdeu.
 *
 * "Registrar" é o ÚNICO botão, e resolve o envio inteiro em uma página
 * só: a pergunta é a qual atividade aquilo pertence, e o resto da tela se
 * ajusta à resposta. Duas opções lado a lado ("vincular" ou "criar")
 * obrigavam a escolher o caminho antes de olhar a lista.
 *
 * Sem filtro e sem StatCard: são os envios da própria pessoa, e a
 * pergunta ao abrir é "o que chegou desde a última vez que olhei".
 */
export function InboxView({ registros }: { registros: InboxRegistro[] }) {
  const [lightbox, setLightbox] = React.useState<InboxRegistro | null>(null);
  const [registrando, setRegistrando] = React.useState<InboxRegistro | null>(
    null
  );
  const [verMais, setVerMais] = React.useState(false);

  function registrar(registro: InboxRegistro) {
    setLightbox(null);
    setRegistrando(registro);
  }

  const naTela = verMais ? registros : registros.slice(0, MAX_VISIVEL);
  const restantes = registros.length - naTela.length;

  if (registros.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>Nada chegou do campo ainda</EmptyTitle>
          <EmptyDescription>
            Toda foto que você mandar pelo WhatsApp aparece aqui, na ordem em
            que chegar.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Grade: o feed é de FOTOS, e lado a lado o olho compara de uma
          vez — que é a pergunta do lote ("isso tudo é a mesma coisa?"). */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {naTela.map((registro) => (
          <InboxCard
            key={registro.id}
            registro={registro}
            onOpenFotos={() => setLightbox(registro)}
            onRegistrar={() => registrar(registro)}
          />
        ))}
      </div>

      {restantes > 0 ? (
        <Button
          variant="outline"
          onClick={() => setVerMais(true)}
          className="self-center"
        >
          Ver mais ({restantes} restantes)
        </Button>
      ) : null}

      {registrando ? (
        <RegistrarDrawer
          registro={registrando}
          onClose={() => setRegistrando(null)}
        />
      ) : null}

      <PhotoLightbox
        open={lightbox !== null}
        onOpenChange={(next) => (next ? undefined : setLightbox(null))}
        fotos={lightbox?.fotos ?? []}
        titulo={lightbox?.titulo ?? lightbox?.canalNome ?? "Envio do campo"}
        onRegistrar={lightbox ? () => registrar(lightbox) : undefined}
      />
    </div>
  );
}
