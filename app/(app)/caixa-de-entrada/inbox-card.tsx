"use client";

import * as React from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { ImageOff } from "lucide-react";

import { CategoryIconBox } from "@/components/shared/icon-box";
import { ClickableCard } from "@/components/shared/clickable-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/config";
import type { InboxRegistro } from "@/lib/db/inbox";
import { relativeFromNow } from "@/lib/relative-time";
import { cn, getInitials } from "@/lib/utils";

/** A partir daqui o registro virou espera, não fila. */
const DIAS_DE_ESPERA = 7;

/**
 * Linha de um registro da caixa de entrada — mesmo ritmo das linhas de
 * Pendências: identidade à esquerda, o que falta à direita.
 *
 * O CANAL NÃO APARECE AQUI: ele é o cabeçalho do grupo logo acima. Ter
 * o nome nos dois lugares era a mesma palavra duas vezes na mesma
 * leitura, e ainda roubava o lugar de quem devia titular a linha.
 *
 * Quem titula é o TÍTULO do envio; sem título, o tipo de ação; sem os
 * dois, o local. O envio cru é legítimo — a linha diz "Foto de Filial
 * Sorriso" em vez de fingir um título que ninguém escreveu.
 *
 * ORÇAMENTO DE AZUL: zero `accent-brand`. Este card só lê; a cor de
 * ação entra na triagem. Card que ainda não faz nada não deve parecer
 * que faz.
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

  const titulo =
    registro.titulo ??
    (registro.tipoAcao ? CATEGORY_LABELS[registro.tipoAcao] : null) ??
    (registro.filialNome ? `Foto de ${registro.filialNome}` : "Foto do campo");

  const contexto = [
    registro.filialNome && registro.titulo ? registro.filialNome : null,
    mostrarAutor ? registro.autorNome : null,
  ].filter(Boolean) as string[];

  return (
    <ClickableCard
      onClick={onOpenFotos}
      className="p-3 text-left sm:p-3.5"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <FotoBloco fotos={registro.fotos} />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {/* Ícone junto do título, não numa linha própria: ele
                qualifica o texto, não é um item à parte. */}
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
            {mostrarAutor ? (
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
            ) : null}
            {contexto.map((item) => (
              <React.Fragment key={item}>
                <span className="truncate">{item}</span>
                <span aria-hidden>·</span>
              </React.Fragment>
            ))}
            {/* Alarme único: quando o registro está esperando, o âmbar
                vive no TEXTO. Não existe badge competindo. */}
            <span className={cn(esperando && "font-medium text-warning")}>
              {esperando
                ? `esperando há ${diasParado} dias`
                : relativeFromNow(registro.recebidoEm)}
            </span>
            {registro.fotos.length > 1 ? (
              <>
                <span aria-hidden>·</span>
                <span>{registro.fotos.length} fotos</span>
              </>
            ) : null}
          </p>

          {registro.descricao ? (
            <p className="truncate text-xs text-muted-foreground">
              {registro.descricao}
            </p>
          ) : null}
        </div>

        {/* Direita: o que o envio já traz e o que ainda falta. É a
            informação que decide o esforço da triagem, então fica na
            borda oposta, onde o olho termina a linha. */}
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          {registro.metaTitulo ? (
            <Badge
              variant="outline"
              className="max-w-[14rem] border-transparent bg-brand-wash text-brand-wash-fg"
            >
              <span className="truncate">{registro.metaTitulo}</span>
            </Badge>
          ) : null}
          {faltando.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              Falta {listar(faltando)}
            </span>
          ) : null}
        </div>
      </div>

      {/* No celular a coluna da direita não cabe: vira uma linha abaixo. */}
      {faltando.length > 0 || registro.metaTitulo ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
          {registro.metaTitulo ? (
            <Badge
              variant="outline"
              className="max-w-full border-transparent bg-brand-wash text-brand-wash-fg"
            >
              <span className="truncate">{registro.metaTitulo}</span>
            </Badge>
          ) : null}
          {faltando.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              Falta {listar(faltando)}
            </span>
          ) : null}
        </div>
      ) : null}
    </ClickableCard>
  );
}

/** "tipo de ação, título e meta" — vírgula até o penúltimo, "e" no fim. */
function listar(itens: string[]): string {
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * Miniatura: uma foto vira quadrado; várias empilham em leque, com o
 * total dito por extenso na linha de contexto. Grade de três dentro de
 * uma linha de 56px viraria três selos ilegíveis — melhor mostrar UMA
 * bem e contar o resto em texto.
 */
function FotoBloco({ fotos }: { fotos: string[] }) {
  const extras = Math.min(fotos.length - 1, 2);

  return (
    <div className="relative shrink-0">
      {/* Cartas atrás, deslocadas: diz "tem mais" sem gastar largura. */}
      {Array.from({ length: extras }).map((_, index) => (
        <span
          key={index}
          aria-hidden
          className="absolute rounded-lg border border-border bg-muted"
          style={{
            inset: 0,
            transform: `translate(${(index + 1) * 3}px, ${(index + 1) * -3}px)`,
            zIndex: -1,
          }}
        />
      ))}
      <Foto src={fotos[0]} className="size-16 sm:size-20" />
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
