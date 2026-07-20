"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Card clicável canônico (Constituição, item 4): borda que escurece um
 * passo no hover + seta com translate-x leve. Padding NÃO incluso —
 * quem consome define p-4 ou p-5.
 */
export const clickableCardClass =
  "group relative rounded-xl border border-border bg-card text-left shadow-card transition-[background-color,border-color,box-shadow] duration-base ease-standard hover:border-border-hover hover:shadow-elevated";

export function CardArrow({ className }: { className?: string }) {
  return (
    <ArrowRight
      className={cn(
        "size-4 shrink-0 text-muted-foreground transition-transform duration-slow ease-emphasized group-hover:translate-x-0.5",
        className
      )}
    />
  );
}

/**
 * `href` renderiza um Link; `onClick` renderiza um button acessível.
 * `showArrow` posiciona a seta canônica centralizada à direita.
 */
export function ClickableCard({
  href,
  onClick,
  showArrow = false,
  className,
  children,
}: {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  showArrow?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const content = (
    <>
      {showArrow && (
        <CardArrow className="absolute right-4 top-1/2 -translate-y-1/2" />
      )}
      {children}
    </>
  );
  const classes = cn(clickableCardClass, "block cursor-pointer", className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(classes, "w-full")}>
      {content}
    </button>
  );
}

/** Chip neutro de contexto (padrão Relatórios). `emphasis` = o dado que importa. */
export function NeutralChip({
  emphasis = false,
  className,
  children,
}: {
  emphasis?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-foreground",
        emphasis && "border border-border-hover font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}
