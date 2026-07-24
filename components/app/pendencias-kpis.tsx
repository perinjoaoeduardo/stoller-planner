"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import {
  PENDENCY_LABELS,
  PENDENCY_TYPES,
  type PendencyType,
} from "@/lib/pendencias-shared";
import { cn } from "@/lib/utils";

const ISSUE_META: Record<
  PendencyType,
  { activeClass: string; description: string }
> = {
  sem_foto: {
    // Âmbar, não vermelho: pendência é atenção — destructive é
    // exclusivo do prazo vencido em aberto (Constituição, item 2).
    activeClass: "border-warning/60 bg-warning/5 dark:bg-warning/10",
    description: "Atividades concluídas sem nenhuma foto de evidência.",
  },
  sem_problema: {
    activeClass: "border-warning/60 bg-warning/5 dark:bg-warning/10",
    description: "Atividades concluídas sem vínculo com uma meta do plano.",
  },
  sem_categoria: {
    activeClass: "border-muted-foreground/60 bg-muted-foreground/5 dark:bg-muted-foreground/10",
    description: "Atividades sem categoria definida.",
  },
};

/**
 * Chips-KPI de /pendencias: cada card é um botão que empurra o filtro
 * `?tipo=` na URL. O server component acima consome esse filtro e
 * refaz a lista. Card ativo ganha borda/tom da própria categoria; card
 * com contador 0 fica desabilitado (nada pra filtrar).
 */
export function PendenciasKpis({
  totalsByType,
  activeFilter,
}: {
  totalsByType: Record<PendencyType, number>;
  activeFilter: PendencyType | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(type: PendencyType | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (type && type !== activeFilter) {
      params.set("tipo", type);
    } else {
      params.delete("tipo");
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-3">
        {PENDENCY_TYPES.map((type) => {
          const meta = ISSUE_META[type];
          const isActive = activeFilter === type;
          const count = totalsByType[type];
          const disabled = count === 0;
          return (
            <Card
              key={type}
              className={cn(
                "gap-2 p-0 transition-[background-color,border-color,box-shadow] duration-base ease-standard",
                isActive
                  ? cn("shadow-elevated!", meta.activeClass)
                  : "border-border bg-card",
                !disabled &&
                  !isActive &&
                  "hover:border-border-hover hover:shadow-elevated!"
              )}
            >
              <button
                type="button"
                onClick={() => (disabled ? undefined : setFilter(type))}
                aria-pressed={isActive}
                disabled={disabled}
                className={cn(
                  "block w-full rounded-xl p-6 text-left",
                  disabled ? "cursor-default opacity-60" : "cursor-pointer"
                )}
              >
                <CardDescription>{PENDENCY_LABELS[type]}</CardDescription>
                <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                  {count}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {meta.description}
                </p>
              </button>
            </Card>
          );
        })}
      </div>

      {activeFilter ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>
            Limpar filtro
          </Button>
        </div>
      ) : null}
    </div>
  );
}
