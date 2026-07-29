"use client";

import { StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Botão "Notas" no header da visão do canal. Mesma ponte por CustomEvent
 * do ProblemsSheetButton: o botão vive no PageShell (server) e quem abre
 * o drawer é o MeuCanalView (client).
 */
export function NotesSheetButton({ count }: { count: number }) {
  return (
    <Button
      variant="outline"
      onClick={() => window.dispatchEvent(new CustomEvent("open-notes-sheet"))}
    >
      <StickyNote className="size-4" />
      Notas
      {count > 0 ? (
        <span className="tabular-nums text-muted-foreground">{count}</span>
      ) : null}
    </Button>
  );
}
