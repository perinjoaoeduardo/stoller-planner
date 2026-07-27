"use client";

// Client obrigatório: o componente passa onClick ao Link, e Server
// Component não serializa event handler. A diretiva tem de ser a
// PRIMEIRA linha do arquivo — comentário antes dela não vale.

import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Nome de pessoa clicável — leva ao perfil (/pessoas/[id]).
 *
 * Existe para que o nome de alguém seja SEMPRE o mesmo tipo de coisa no
 * app: um caminho para "como está o trabalho dessa pessoa". Antes o nome
 * era texto morto na maior parte das telas e link em uma só, então o
 * usuário aprendia que nome não clica — e deixava de tentar justamente
 * onde clicaria.
 *
 * Sem `profileId` (registro legado, pessoa removida) degrada para texto:
 * melhor não clicável do que um link que cai em 404.
 */
export function PersonLink({
  profileId,
  name,
  className,
}: {
  profileId: string | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  if (!name) return null;
  if (!profileId) {
    return <span className={className}>{name}</span>;
  }
  return (
    <Link
      href={`/pessoas/${profileId}`}
      // stopPropagation: o nome costuma viver dentro de uma linha que já
      // é clicável (abre a atividade). Sem isso, clicar no nome abriria
      // as duas coisas.
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      {name}
    </Link>
  );
}
