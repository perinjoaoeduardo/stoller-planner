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
 * Anatomia: título sm/medium + ícone muted à direita, valor 3xl/bold,
 * sublabel xs/muted. `tone="warning"` pinta valor e ícone de âmbar
 * (quem consome decide, ex.: atrasadas > 0). `interactive` liga os 3
 * estados (padrão/hover/ativo); a lógica de filtro fica na tela.
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
}: {
  title: string;
  value: number | string;
  sublabel?: string;
  icon: LucideIcon;
  tone?: "neutral" | "warning";
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <Icon
          className={cn(
            "ml-auto size-4 shrink-0",
            tone === "warning" ? "text-warning" : "text-muted-foreground"
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-bold tracking-tight tabular-nums",
          tone === "warning" ? "text-warning" : "text-foreground"
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

  const cardClass = cn(
    "rounded-xl p-0 shadow-sm transition-all duration-150",
    interactive
      ? active
        ? "border-2 border-border-active bg-subtle shadow-md"
        : "border-border bg-card hover:border-border-hover hover:bg-hover-surface"
      : "border-border bg-card"
  );

  if (href) {
    return (
      <Card className={cn(cardClass, "hover:bg-hover-surface")}>
        <Link href={href} className="block p-5">
          {body}
        </Link>
      </Card>
    );
  }

  if (interactive) {
    return (
      <Card className={cardClass}>
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
    <Card className={cardClass}>
      <div className="p-5">{body}</div>
    </Card>
  );
}
