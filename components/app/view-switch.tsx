"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Alternador de visão (segmented control) — ex.: Lista ↔ Calendário na
 * mesma tela de atividades. Cada visão é um nó React já pronto; só o
 * ativo é montado no DOM. A escolha persiste por `storageKey` para a
 * tela reabrir na última visão usada.
 *
 * Segue a Constituição: trilho em bg-muted (camada 3), botão ativo sobe
 * para bg-card (camada 1) — mesmo idioma dos outros segmented do app.
 */

export type ViewOption = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  node: React.ReactNode;
};

// Store mínimo compartilhado: notifica todos os ViewSwitch quando um
// grava no localStorage, mantendo useSyncExternalStore SSR-safe.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function usePersistedView(storageKey: string, fallback: string) {
  const value = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(storageKey) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback
  );

  const set = React.useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // localStorage indisponível — a escolha vale só nesta sessão.
      }
      listeners.forEach((l) => l());
    },
    [storageKey]
  );

  return [value, set] as const;
}

export function ViewSwitch({
  storageKey,
  views,
  actions,
}: {
  storageKey: string;
  views: ViewOption[];
  /** Ações à direita do trilho (ex.: filtros da visão). Opcional. */
  actions?: React.ReactNode;
}) {
  const [stored, setStored] = usePersistedView(storageKey, views[0].key);
  // Se a chave salva não existir mais entre as visões, cai na primeira.
  const active = views.some((v) => v.key === stored) ? stored : views[0].key;
  const current = views.find((v) => v.key === active) ?? views[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Alternar visão"
          className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
        >
          {views.map((view) => {
            const isActive = view.key === active;
            return (
              <button
                key={view.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setStored(view.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {view.icon}
                {view.label}
              </button>
            );
          })}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {current.node}
    </div>
  );
}
