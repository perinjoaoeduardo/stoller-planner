"use client";

import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Botão "Ver metas" no header da visão do canal. Dispara um
 * CustomEvent que o client MeuCanalView escuta para abrir o Sheet
 * lateral de problemas.
 */
export function ProblemsSheetButton({ count }: { count: number }) {
  return (
    <Button
      variant="outline"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("open-problems-sheet"))
      }
      className="gap-2"
    >
      <Target className="size-4" />
      <span className="md:hidden">Metas</span>
      <span className="hidden md:inline">Ver metas</span>
      <span className="tabular-nums text-muted-foreground">{count}</span>
    </Button>
  );
}
