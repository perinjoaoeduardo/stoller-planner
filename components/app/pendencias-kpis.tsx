"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  PENDENCY_LABELS,
  PENDENCY_TYPES,
  type PendencyType,
} from "@/lib/pendencias-shared";
import { cn } from "@/lib/utils";

/**
 * Cada tipo de pendência tem UMA cor, a mesma do badge na lista abaixo
 * (ISSUE_BADGE_CLASS) — o número no topo e o chip na linha têm que ser
 * lidos como a mesma coisa. Família própria, fora do vocabulário de
 * status: âmbar/azul/verde já significam atrasada/planejada/concluída.
 */
const ISSUE_META: Record<
  PendencyType,
  { activeClass: string; valueClass: string; description: string }
> = {
  sem_foto: {
    activeClass: "border-pend-foto-fg/40 bg-pend-foto-bg/50",
    valueClass: "text-pend-foto-fg",
    description: "Atividades concluídas sem nenhuma foto de evidência.",
  },
  sem_problema: {
    activeClass: "border-pend-meta-fg/40 bg-pend-meta-bg/50",
    valueClass: "text-pend-meta-fg",
    description: "Atividades concluídas sem vínculo com uma meta do plano.",
  },
  sem_categoria: {
    activeClass: "border-muted-foreground/60 bg-muted-foreground/5 dark:bg-muted-foreground/10",
    valueClass: "text-muted-foreground",
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
  onlyMine = false,
  canToggleScope = false,
}: {
  totalsByType: Record<PendencyType, number>;
  activeFilter: PendencyType | null;
  onlyMine?: boolean;
  canToggleScope?: boolean;
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

  function setScope(mine: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (mine) {
      params.set("escopo", "minhas");
    } else {
      params.delete("escopo");
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  // Só mostra o tipo de pendência que EXISTE — um card "Sem categoria 0"
  // é ruído: não há o que resolver ali. As colunas se ajustam ao que sobra.
  const visible = PENDENCY_TYPES.filter((type) => totalsByType[type] > 0);
  const cols =
    visible.length >= 3
      ? "sm:grid-cols-3"
      : visible.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-1";

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("grid gap-4", cols)}>
        {visible.map((type) => {
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
                <p
                  className={cn(
                    "mt-2 text-3xl font-semibold tracking-tight tabular-nums",
                    meta.valueClass
                  )}
                >
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

      {/* Controles ABAIXO dos números: o card é o dado, o toggle é o
          recorte. Acima, o toggle empurrava os KPIs para baixo e roubava
          a primeira leitura da tela. */}
      {canToggleScope || activeFilter ? (
        <div className="flex items-center gap-3">
          {canToggleScope ? (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Switch
                checked={onlyMine}
                onCheckedChange={(checked) => setScope(checked)}
              />
              Só minhas
            </label>
          ) : null}
          {activeFilter ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setFilter(null)}
            >
              Limpar filtro
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
