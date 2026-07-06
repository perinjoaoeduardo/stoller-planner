import { Sprout } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Logo do Stoller Planner (texto estilizado por enquanto).
 * Componente isolado para trocar por SVG oficial depois.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Sprout className="size-4" aria-hidden="true" />
      </span>
      <span className="text-sm leading-none font-semibold tracking-tight whitespace-nowrap">
        Stoller{" "}
        <span className="font-normal opacity-80">Planner</span>
      </span>
    </span>
  );
}
