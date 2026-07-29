"use client";

import * as React from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { ImageOff, Images, Link2, Plus, Trash2 } from "lucide-react";

import { CategoryIconBox } from "@/components/shared/icon-box";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CATEGORY_LABELS } from "@/lib/config";
import type { InboxRegistro } from "@/lib/db/inbox";
import { relativeFromNow } from "@/lib/relative-time";
import { cn, getInitials } from "@/lib/utils";

/** A partir daqui o registro virou espera, não fila. */
const DIAS_DE_ESPERA = 7;

/**
 * Ladrilho de um registro — a caixa de entrada é uma fila de FOTOS, e a
 * grade é o formato que a foto pede.
 *
 * Linha inteira por registro gastava a largura toda para carregar 80px
 * de foto e três palavras, e no lote (quatro envios do mesmo
 * treinamento) empilhava linhas idênticas que só a miniatura
 * distinguia. Lado a lado, o olho compara as fotos de uma vez — que é
 * exatamente a pergunta da triagem: "isso aqui é tudo a mesma coisa?".
 *
 * O canal não aparece: é o cabeçalho do grupo logo acima.
 *
 * ORÇAMENTO DE AZUL: zero `accent-brand`. Este ladrilho só lê; a cor de
 * ação entra na triagem.
 */
export function InboxCard({
  registro,
  mostrarAutor,
  onOpenFotos,
  onVincular,
  onCriar,
  onDescartar,
  ocupado = false,
}: {
  registro: InboxRegistro;
  /** Ligado com "Ver de todos": de quem é o envio passa a importar. */
  mostrarAutor: boolean;
  onOpenFotos: () => void;
  onVincular: () => void;
  onCriar: () => void;
  onDescartar: () => void;
  ocupado?: boolean;
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

  // Quem titula é o título do envio; sem título, o tipo de ação; sem os
  // dois, o local. O envio cru é legítimo — o ladrilho diz o que é em
  // vez de fingir um título que ninguém escreveu.
  const titulo =
    registro.titulo ??
    (registro.tipoAcao ? CATEGORY_LABELS[registro.tipoAcao] : null) ??
    (registro.filialNome ?? "Foto do campo");

  return (
    <div
      className={cn(
        "group/registro flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-[opacity,border-color] duration-base ease-standard hover:border-border-hover",
        ocupado && "pointer-events-none opacity-50"
      )}
    >
      {/* A FOTO é o gatilho do lightbox. O ladrilho inteiro não pode ser
          botão: ele tem botões dentro, e botão dentro de botão é HTML
          inválido. */}
      <button
        type="button"
        onClick={onOpenFotos}
        aria-label="Ver fotos do registro"
        className="relative cursor-pointer"
      >
        <Foto src={registro.fotos[0]} />

        {registro.fotos.length > 1 ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-foreground/70 px-1.5 py-0.5 text-xs font-medium text-background">
            <Images className="size-3" />
            {registro.fotos.length}
          </span>
        ) : null}

        {mostrarAutor ? (
          <Avatar className="absolute bottom-2 left-2 size-6 border-2 border-card">
            {registro.autorAvatarUrl ? (
              <AvatarImage
                src={registro.autorAvatarUrl}
                alt={registro.autorNome}
              />
            ) : null}
            <AvatarFallback className="text-[9px]">
              {getInitials(registro.autorNome)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex min-w-0 items-center gap-2">
          {registro.tipoAcao ? (
            <CategoryIconBox
              category={registro.tipoAcao}
              size="sm"
              withTooltip
            />
          ) : null}
          <p className="truncate text-sm font-medium text-foreground">
            {titulo}
          </p>
        </div>

        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {registro.filialNome && registro.titulo ? (
            <>
              <span className="truncate">{registro.filialNome}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {/* Alarme único: quando o registro está esperando, o âmbar
              vive no TEXTO. Não existe badge competindo. */}
          <span className={cn(esperando && "font-medium text-warning")}>
            {esperando
              ? `esperando há ${diasParado} dias`
              : relativeFromNow(registro.recebidoEm)}
          </span>
        </p>

        {/* O que falta, em neutro: faltar informação não é erro, é o
            fluxo normal do envio rápido. */}
        {faltando.length > 0 ? (
          <p className="truncate text-xs text-muted-foreground">
            Falta {listar(faltando)}
          </p>
        ) : registro.metaTitulo ? (
          <p className="truncate text-xs text-muted-foreground">
            {registro.metaTitulo}
          </p>
        ) : null}
      </div>

      {/* Ações: no hover no desktop, SEMPRE visíveis no toque — a
          triagem acontece em campo e lá não existe hover.

          "Criar atividade" é a primária e leva o ÚNICO accent-brand do
          ladrilho. Descartar é ícone: é a saída, não o destino. */}
      <div className="flex items-center gap-1.5 border-t border-border p-2 opacity-100 transition-opacity duration-base md:opacity-0 md:group-hover/registro:opacity-100 md:focus-within:opacity-100">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1"
          onClick={onVincular}
        >
          <Link2 />
          Vincular
        </Button>
        <Button
          variant="brand"
          size="sm"
          className="h-9 flex-1"
          onClick={onCriar}
        >
          <Plus />
          Criar
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDescartar}
                aria-label="Descartar registro"
                className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Trash2 />
              </Button>
            }
          />
          <TooltipContent>Descartar</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/** "tipo de ação, título e meta" — vírgula até o penúltimo, "e" no fim. */
function listar(itens: string[]): string {
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
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
