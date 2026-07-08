"use client";

import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Botão "Ver problemas" no header da visão do canal. Dispara um
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
      Ver problemas
      <Badge variant="secondary" className="ml-1 tabular-nums">
        {count}
      </Badge>
    </Button>
  );
}
