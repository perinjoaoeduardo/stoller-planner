"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Esqueleto único de wizard (agendar e fora do plano): header com
 * título+subtítulo+X, stepper de barrinhas segmentadas e rodapé fixo
 * com Voltar/ação primária. O conteúdo do passo rola entre header e
 * rodapé; as telas de passo são children puros.
 */

/** Stepper de barrinhas: uma por passo, sem círculos. */
export function WizardStepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="px-6 pb-4">
      <div className="flex gap-2">
        {steps.map((label, i) => (
          <span
            key={label}
            aria-hidden
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i < current
                ? "bg-accent-brand"
                : i === current
                  ? "bg-accent-brand"
                  : "bg-border"
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Passo {current + 1} de {steps.length} · {steps[current]}
      </p>
    </div>
  );
}

/** Header do wizard: título + subtítulo + X (a confirmação de descarte
 *  fica com quem consome, via onClose). */
export function WizardHeader({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="min-w-0">
          <p className="text-base font-semibold">{title}</p>
          {subtitle ? (
            <p className="truncate text-sm text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="shrink-0"
        >
          <X className="size-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      </div>
      {children}
    </div>
  );
}

/**
 * Rodapé fixo: Voltar outline à esquerda (oculto sem onBack) + ação
 * primária à direita, com hint quando desabilitada.
 */
export function WizardFooter({
  onBack,
  backDisabled,
  hint,
  children,
}: {
  onBack?: () => void;
  backDisabled?: boolean;
  hint?: string | null;
  children?: React.ReactNode;
}) {
  return (
    /* A dica sobe para a própria linha no celular: espremida entre os
       dois botões ela quebrava em três linhas e empurrava o primário
       para fora do alcance do polegar. Área segura porque este rodapé
       encosta na barra de gestos. */
    <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
      {hint && (
        <p className="text-xs text-muted-foreground sm:order-2">{hint}</p>
      )}
      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="sm:order-1">
          {onBack && (
            <Button variant="outline" onClick={onBack} disabled={backDisabled}>
              Voltar
            </Button>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-3 sm:order-3">
          {children}
        </div>
      </div>
    </div>
  );
}

