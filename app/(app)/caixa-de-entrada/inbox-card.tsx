"use client";

import * as React from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Camera, Check, ImageOff, Images } from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import { Button } from "@/components/ui/button";
import type { InboxRegistro } from "@/lib/db/inbox";
import { relativeFromNow } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

/** A partir daqui o registro virou espera, não fila. */
const DIAS_DE_ESPERA = 7;

/**
 * Ladrilho de um registro. O feed é de FOTOS, e a grade é o formato que a
 * foto pede: lado a lado o olho compara de uma vez, que é a pergunta do
 * lote ("isso tudo é a mesma coisa?").
 *
 * TRÊS LINHAS, e nada mais. A foto já diz quase tudo; o texto só precisa
 * responder "o quê, onde, quando". Tipo de ação, meta, o que falta
 * preencher — nada disso muda a decisão de olhar ou não, e cada um deles
 * era uma linha a mais para varrer em cada ladrilho da grade.
 *
 * UM BOTÃO SÓ: "Registrar" — o mesmo verbo e o mesmo ícone do card de
 * atividade, porque é a mesma coisa que ele faz. Abre a tela de registro
 * já no canal do envio, com os campos preenchidos com o que veio do
 * campo. Escolher entre atividade planejada e fora do plano é decisão
 * daquela tela; duplicá-la no ladrilho obrigava a decidir antes mesmo de
 * olhar a foto.
 *
 * Registrado não tem botão: a decisão já foi tomada, e a linha do tique
 * vira o atalho para a atividade que ele virou.
 *
 * NÃO existe descartar: tudo que chegou do campo é trabalho de alguém.
 *
 * ORÇAMENTO DE AZUL: zero. O ladrilho lê; a cor de ação mora no menu.
 */
export function InboxCard({
  registro,
  onOpenFotos,
  onRegistrar,
  ocupado = false,
}: {
  registro: InboxRegistro;
  onOpenFotos: () => void;
  onRegistrar: () => void;
  ocupado?: boolean;
}) {
  const { openActivity } = useActivityDrawer();
  const registrado = registro.status === "registrado";

  const diasParado = differenceInCalendarDays(
    new Date(),
    parseISO(registro.recebidoEm)
  );
  // Espera só conta para quem ainda precisa de decisão: registro já
  // resolvido não está parado, está pronto.
  const esperando = !registrado && diasParado >= DIAS_DE_ESPERA;

  // Título só quando existe DE VERDADE: a atividade que o envio virou,
  // ou o que a pessoa escreveu ao mandar. O rótulo da categoria fazendo
  // as vezes de título batizava o envio com um nome que ninguém deu —
  // "Reunião de resultado com gerente" parecia o assunto daquela foto
  // quando era só a gaveta em que ela cai. Sem título, o ladrilho diz o
  // que dá para saber: de onde veio e quando chegou.
  const titulo = registro.atividadeTitulo ?? registro.titulo;

  const moldura = cn(
    "group/registro flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-card transition-[opacity,border-color] duration-base ease-standard hover:border-border-hover",
    ocupado && "pointer-events-none opacity-50"
  );

  /* Registrado: o ladrilho INTEIRO leva à atividade, porque é tudo que
     ele é — a foto já virou evidência de lá, e abri-la num lightbox
     daqui seria um beco. Sem botão dentro, o ladrilho pode ser o botão.

     Pendente: a foto abre o lightbox e o rodapé abre o registro, então
     a moldura tem de ser uma div — botão dentro de botão é HTML
     inválido. */
  const corpo = (
    <>
      {registrado ? (
        <div className="relative">
          <Foto src={registro.fotos[0]} />
          {registro.fotos.length > 1 ? (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-foreground/70 px-1.5 py-0.5 text-xs font-medium text-background">
              <Images className="size-3" />
              {registro.fotos.length}
            </span>
          ) : null}
        </div>
      ) : (
      <button
        type="button"
        onClick={onOpenFotos}
        aria-label={`Ver fotos de ${titulo ?? registro.canalNome}`}
        className="relative cursor-pointer"
      >
        <Foto src={registro.fotos[0]} />

        {registro.fotos.length > 1 ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-foreground/70 px-1.5 py-0.5 text-xs font-medium text-background">
            <Images className="size-3" />
            {registro.fotos.length}
          </span>
        ) : null}
      </button>
      )}

      <div className="flex flex-1 items-start gap-1 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {titulo ? (
            <p className="truncate text-sm font-medium text-foreground">
              {titulo}
            </p>
          ) : null}

          {/* Onde e quando. O canal precisa estar aqui porque o feed não
              tem cabeçalho de grupo — é ele que decide a qual plano a
              evidência pertence. Sem título ele assume a primeira linha:
              alguma coisa tem de ancorar o ladrilho. */}
          <p
            className={cn(
              "truncate",
              titulo
                ? "text-xs text-muted-foreground"
                : "text-sm font-medium text-foreground"
            )}
          >
            {[registro.canalNome, registro.filialNome]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {registrado ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              {/* Verde = concluído, como em todo o app — num tique de
                  14px, tamanho de confirmação e não de alerta. */}
              <Check className="size-3.5 shrink-0 text-success" />
              Registrada
            </p>
          ) : (
            <p className="truncate text-xs text-muted-foreground">
              {/* Alarme único: quando o registro está esperando, o âmbar
                  vive no TEXTO. Não existe selo competindo. */}
              <span className={cn(esperando && "font-medium text-warning")}>
                {esperando
                  ? `esperando há ${diasParado} dias`
                  : relativeFromNow(registro.recebidoEm)}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Ação primária com corpo de botão e rótulo por extenso: o "⋯"
          anterior não dizia o que fazia e nem parecia apertável num
          ladrilho cheio de foto. Aqui ela é a única coisa azul. */}
      {registrado ? null : (
        <div className="border-t border-border p-2">
          <Button
            variant="brand"
            size="sm"
            className="h-9 w-full"
            onClick={onRegistrar}
          >
            <Camera />
            Registrar
          </Button>
        </div>
      )}
    </>
  );

  if (registrado) {
    return (
      <button
        type="button"
        disabled={!registro.atividadeId}
        onClick={() =>
          registro.atividadeId && openActivity(registro.atividadeId)
        }
        aria-label={`Abrir ${titulo ?? "atividade"}`}
        className={cn(moldura, "cursor-pointer disabled:cursor-default")}
      >
        {corpo}
      </button>
    );
  }

  return <div className={moldura}>{corpo}</div>;
}

function Foto({ src }: { src: string }) {
  if (!src) {
    return (
      <span className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
        <ImageOff className="size-5 text-muted-foreground" />
      </span>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt="Foto do registro"
      className="aspect-[4/3] w-full bg-muted object-cover"
    />
  );
}
