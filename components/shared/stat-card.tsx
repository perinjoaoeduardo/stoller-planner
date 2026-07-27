// Sem "use client" de propósito: importado por telas client vira client
// (onClick funciona); importado por páginas server (home) renderiza no
// servidor — e aí ícones-função podem cruzar como props sem quebrar RSC.
import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Stat card ÚNICO do app (home, Minhas Atividades, Visão do Canal).
 * Anatomia: título sm/medium + valor 3xl/bold + sublabel xs/muted.
 * `interactive` liga os 3 estados (padrão/hover/ativo); a lógica de
 * filtro fica na tela.
 *
 * `tone` amarra o KPI à MESMA cor do status que ele conta — azul =
 * planejada/aberta, âmbar = atrasada, verde = concluída. Um número que
 * filtra a lista tem que usar a cor que a lista usa, senão o usuário
 * aprende a cor duas vezes. Neutro é o padrão: contagem sem status
 * (Total) não ganha cor.
 *
 * `icon` é OPCIONAL e por padrão nem aparece: num card com título e
 * número por extenso, o glifo não informa nada (carga cognitiva). Só
 * passar ícone quando ele de fato ajudar a ler.
 */
export function StatCard({
  title,
  value,
  sublabel,
  icon: Icon,
  tone = "neutral",
  interactive = false,
  active = false,
  onClick,
  href,
  className,
  valueClassName,
}: {
  title: string;
  value: number | string;
  sublabel?: string;
  icon?: LucideIcon;
  /** Cor do valor, espelhando o status contado (ver STATUS_ORDER /
   *  StatusBadge). Sem vermelho: KPI nunca é alarme destrutivo. */
  tone?: "neutral" | "info" | "warning" | "success";
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  /** Classe extra no Card. */
  className?: string;
  /** Classe extra no valor — para valores TEXTUAIS (lista de meses,
   *  status por extenso) que em 3xl quebrariam em várias linhas e
   *  desproporcionariam a fileira. Ex.: "text-xl leading-snug". */
  valueClassName?: string;
}) {
  // Zero não ganha cor: "0 atrasadas" pintado de âmbar acende um alarme
  // que não existe. Cor de status só quando há o que contar. Aceita
  // número e string ("0", "0%") — os callers passam os dois.
  const isZero = value === 0 || value === "0" || value === "0%";
  const accentClass =
    isZero || tone === "neutral"
      ? null
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-accent-brand";

  const body = (
    <>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {Icon ? (
          <Icon
            className={cn(
              "ml-auto size-4 shrink-0",
              accentClass ?? "text-muted-foreground"
            )}
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-bold tracking-tight tabular-nums",
          accentClass ?? "text-foreground",
          valueClassName
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {sublabel}
        </p>
      ) : null}
    </>
  );

  // Card do shadcn traz `shadow-xs` no base; precisamos do bang pra que
  // nossos tokens shadow-card / shadow-elevated ganhem (Tailwind v4 gera
  // essas utilities em ordem alfabética e xs sai depois de elevated).
  // Hover canônico (igual ao ClickableCard / cards de Meus Canais):
  // a borda escurece um passo e o card sobe (shadow-elevated). Sem
  // troca de fundo — o "lift" é o sinal único de interação.
  const cardClass = cn(
    "rounded-xl p-0 shadow-card! transition-[background-color,border-color,box-shadow] duration-base ease-standard",
    interactive
      ? active
        ? "border border-primary/40 bg-subtle shadow-elevated!"
        : "border border-border bg-card hover:border-border-hover hover:shadow-elevated!"
      : "border border-border bg-card"
  );

  if (href) {
    return (
      <Card
        className={cn(
          cardClass,
          "hover:border-border-hover hover:shadow-elevated!",
          // Por último: a tinta do caller (ex.: card estrela CX) ganha
          // inclusive do hover canônico.
          className
        )}
      >
        <Link href={href} className="block p-5">
          {body}
        </Link>
      </Card>
    );
  }

  if (interactive) {
    return (
      <Card className={cn(cardClass, className)}>
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          className="block w-full cursor-pointer p-5 text-left"
        >
          {body}
        </button>
      </Card>
    );
  }

  return (
    <Card className={cn(cardClass, className)}>
      <div className="p-5">{body}</div>
    </Card>
  );
}
