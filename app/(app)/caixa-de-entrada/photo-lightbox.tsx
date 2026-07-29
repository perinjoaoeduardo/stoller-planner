"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Lightbox das fotos de um registro — só leitura.
 *
 * A foto É o conteúdo do envio: na fila ela aparece pequena, e o único
 * jeito de julgar "isso virou o quê?" é olhar de perto. Setas e Esc
 * porque o caso comum é o registro com 3 ou 4 fotos do mesmo evento.
 */
export function PhotoLightbox({
  fotos,
  titulo,
  open,
  onOpenChange,
}: {
  fotos: string[];
  titulo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [index, setIndex] = React.useState(0);
  const total = fotos.length;

  // Reset no evento de abrir, não em effect (setState em effect dispara
  // render em cascata e o lint do projeto barra).
  function handleOpenChange(next: boolean) {
    if (next) setIndex(0);
    onOpenChange(next);
  }

  const go = React.useCallback(
    (delta: number) => setIndex((i) => (i + delta + total) % total),
    [total]
  );

  React.useEffect(() => {
    if (!open || total < 2) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, total, go]);

  const current = fotos[index];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="text-base">{titulo}</DialogTitle>
        <DialogDescription>
          {total === 1 ? "1 foto" : `Foto ${index + 1} de ${total}`}
        </DialogDescription>

        <div className="relative flex items-center justify-center rounded-lg bg-muted">
          {current ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={current}
              alt={`${titulo} — foto ${index + 1}`}
              className="max-h-[70dvh] w-full rounded-lg object-contain"
            />
          ) : (
            <span className="flex h-64 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="size-6" />
              <span className="text-sm">Arquivo indisponível</span>
            </span>
          )}

          {total > 1 ? (
            <>
              <LightboxArrow side="left" onClick={() => go(-1)} />
              <LightboxArrow side="right" onClick={() => go(1)} />
            </>
          ) : null}
        </div>

        {total > 1 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {fotos.map((foto, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "size-12 cursor-pointer overflow-hidden rounded-md border-2 transition-colors",
                  i === index ? "border-foreground" : "border-transparent"
                )}
              >
                {foto ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={foto}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-muted">
                    <ImageOff className="size-3.5 text-muted-foreground" />
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LightboxArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-label={side === "left" ? "Foto anterior" : "Próxima foto"}
      className={cn(
        "absolute top-1/2 size-9 -translate-y-1/2 rounded-full",
        side === "left" ? "left-2" : "right-2"
      )}
    >
      {side === "left" ? <ChevronLeft /> : <ChevronRight />}
    </Button>
  );
}
