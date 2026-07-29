"use client";

import * as React from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { ImageOff } from "lucide-react";

import { CategoryIconBox } from "@/components/shared/icon-box";
import { ClickableCard } from "@/components/shared/clickable-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { InboxRegistro } from "@/lib/db/inbox";
import { relativeFromNow } from "@/lib/relative-time";
import { cn, getInitials } from "@/lib/utils";

/** A partir daqui o registro virou espera, não fila. */
const DIAS_DE_ESPERA = 7;

/**
 * Card de um registro da caixa de entrada.
 *
 * A foto domina porque ela É o envio: o resto pode ter chegado vazio.
 * Da esquerda para a direita: fotos → identidade (canal, autor, local,
 * quando) → o que veio preenchido → o que falta.
 *
 * ORÇAMENTO DE AZUL: zero `accent-brand` aqui. Este card só lê; a cor
 * de ação entra na triagem. Um card que ainda não faz nada não deve
 * parecer que faz.
 *
 * "Falta tipo de ação e meta" é texto neutro, sem ícone e sem badge:
 * faltar informação não é erro, é o fluxo normal do envio rápido. Quem
 * mandou só a foto fez o certo para o contexto dele.
 */
export function InboxCard({
  registro,
  mostrarAutor,
  onOpenFotos,
}: {
  registro: InboxRegistro;
  /** Ligado com "Ver de todos": de quem é o envio passa a importar. */
  mostrarAutor: boolean;
  onOpenFotos: () => void;
}) {
  const diasParado = differenceInCalendarDays(
    new Date(),
    parseISO(registro.recebidoEm)
  );
  const esperando = diasParado >= DIAS_DE_ESPERA;

  const faltando = [
    !registro.tipoAcao ? "tipo de ação" : null,
    !registro.titulo ? "título" : null,
    !registro.metaId ? "meta" : null,
  ].filter(Boolean) as string[];

  return (
    <ClickableCard onClick={onOpenFotos} className="p-3 text-left">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <FotoBloco fotos={registro.fotos} />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {registro.canalNome}
            </p>
            {/* Autor, local e quando numa linha só: são o contexto do
                envio, não três fatos independentes. */}
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              {mostrarAutor ? (
                <>
                  <Avatar className="size-4 shrink-0">
                    {registro.autorAvatarUrl ? (
                      <AvatarImage
                        src={registro.autorAvatarUrl}
                        alt={registro.autorNome}
                      />
                    ) : null}
                    <AvatarFallback className="text-[8px]">
                      {getInitials(registro.autorNome)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{registro.autorNome}</span>
                  <span aria-hidden>·</span>
                </>
              ) : null}
              {registro.filialNome ? (
                <>
                  <span>{registro.filialNome}</span>
                  <span aria-hidden>·</span>
                </>
              ) : null}
              {/* Alarme único: quando o registro está esperando, o
                  âmbar vive no TEXTO. Não existe badge competindo. */}
              <span className={cn(esperando && "font-medium text-warning")}>
                {esperando
                  ? `esperando há ${diasParado} dias`
                  : relativeFromNow(registro.recebidoEm)}
              </span>
            </p>
          </div>

          {registro.tipoAcao || registro.metaTitulo || registro.titulo ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {registro.tipoAcao ? (
                  <CategoryIconBox
                    category={registro.tipoAcao}
                    size="sm"
                    withTooltip
                  />
                ) : null}
                {registro.metaTitulo ? (
                  <Badge
                    variant="outline"
                    className="max-w-[16rem] border-transparent bg-brand-wash text-brand-wash-fg"
                  >
                    <span className="truncate">{registro.metaTitulo}</span>
                  </Badge>
                ) : null}
              </div>
              {registro.titulo ? (
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {registro.titulo}
                  </p>
                  {registro.descricao ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {registro.descricao}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {faltando.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Falta {listar(faltando)}
            </p>
          ) : null}
        </div>
      </div>
    </ClickableCard>
  );
}

/** "tipo de ação, título e meta" — vírgula até o penúltimo, "e" no fim. */
function listar(itens: string[]): string {
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * Uma foto ocupa um quadrado maior; várias viram grade de 3 com "+N"
 * sobre a última. O contador evita a mentira de mostrar 3 quando são 6.
 */
function FotoBloco({ fotos }: { fotos: string[] }) {
  const total = fotos.length;

  if (total === 1) {
    return (
      <div className="w-full shrink-0 sm:w-28">
        <Foto src={fotos[0]} className="aspect-square w-full sm:size-28" />
      </div>
    );
  }

  const visiveis = fotos.slice(0, 3);
  const restante = total - visiveis.length;

  return (
    <div className="grid w-full shrink-0 grid-cols-2 gap-1 sm:w-28 sm:grid-cols-3">
      {visiveis.map((foto, index) => {
        const ultima = index === visiveis.length - 1;
        return (
          <div key={index} className="relative">
            <Foto src={foto} className="aspect-square w-full" />
            {ultima && restante > 0 ? (
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/60 text-xs font-semibold text-background">
                +{restante}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Foto({ src, className }: { src: string; className?: string }) {
  if (!src) {
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded-lg border bg-muted",
          className
        )}
      >
        <ImageOff className="size-4 text-muted-foreground" />
      </span>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt="Foto do registro"
      className={cn("rounded-lg border object-cover", className)}
    />
  );
}
