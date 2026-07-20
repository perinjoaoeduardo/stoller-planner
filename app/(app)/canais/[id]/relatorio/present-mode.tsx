"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Modo Apresentar — um bloco por slide, em cima da tela.
 *
 * Reaproveita os MESMOS nós React da tela normal (recebidos em `slides`),
 * então nada é reimplementado aqui: o relatório é a fonte da verdade e
 * esta view só controla navegação e chrome.
 */

export type Slide = { id: string; title: string; node: React.ReactNode };

export function PresentMode({
  slides,
  onClose,
}: {
  slides: Slide[];
  onClose: () => void;
}) {
  const [index, setIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const total = slides.length;
  const go = React.useCallback(
    (delta: number) =>
      setIndex((current) => Math.min(Math.max(current + delta, 0), total - 1)),
    [total]
  );

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "Escape") {
        // Se estiver em fullscreen do browser, o Esc já sai dele; só
        // fechamos a apresentação quando não há fullscreen ativo.
        if (!document.fullscreenElement) onClose();
      } else if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          containerRef.current?.requestFullscreen().catch(() => {});
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Trava o scroll do body enquanto apresenta.
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const current = slides[index];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-background print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Apresentação do relatório"
    >
      {/* Topo */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <span className="text-sm tabular-nums text-muted-foreground">
          {index + 1} / {total}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {current?.title}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              containerRef.current?.requestFullscreen().catch(() => {});
            }
          }}
          aria-label="Tela cheia (F)"
        >
          <Maximize className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fechar apresentação (Esc)"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Slide */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-8 md:p-16">
          {current?.node}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex shrink-0 items-center justify-center gap-4 border-t border-border px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Slide anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={slide.title}
              aria-current={i === index}
              className={cn(
                "size-1.5 cursor-pointer rounded-full transition-colors",
                i === index
                  ? "bg-accent-brand"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
              )}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => go(1)}
          disabled={index === total - 1}
          aria-label="Próximo slide"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
