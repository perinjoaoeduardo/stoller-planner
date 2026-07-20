import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Ritmo da safra — heatmap horizontal de ações por mês.
 *
 * Substitui o gráfico de barras azuis: densidade via alpha do
 * foreground (Constituição — azul não codifica volume), uma célula por
 * mês da safra INTEIRA (setembro a agosto). Os buracos são exatamente o
 * insight (abandono, sazonalidade), então mês sem ação renderiza como
 * célula vazia; mês futuro fica meio-transparente para dizer "ainda não
 * aconteceu" sem sumir do gráfico.
 */

export type HeatmapMonth = {
  /** "2026-07" */
  month: string;
  total: number;
  /** Mês posterior ao corrente na safra atual. */
  future?: boolean;
};

/** 5 níveis de densidade. Índice 0 = nenhuma ação. */
const LEVELS = [
  "bg-muted",
  "bg-foreground/10",
  "bg-foreground/25",
  "bg-foreground/50",
  "bg-foreground/80",
] as const;

function levelOf(total: number): number {
  if (total === 0) return 0;
  if (total <= 2) return 1;
  if (total <= 4) return 2;
  if (total <= 7) return 3;
  return 4;
}

function monthLabel(month: string) {
  return format(parseISO(`${month}-01`), "MMM yy", { locale: ptBR }).replace(
    ".",
    ""
  );
}

export function SeasonHeatmap({
  data,
  currentMonth,
  className,
}: {
  data: HeatmapMonth[];
  /** "2026-07" — recebe de fora para não flutuar entre renders. */
  currentMonth: string;
  className?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma ação registrada no recorte atual.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* 12-col no desktop, 6-col em 2 linhas no mobile: cabe safra
          inteira sem apertar a leitura. */}
      <div className="grid grid-cols-6 items-end gap-2 md:grid-cols-12">
        {data.map((entry) => {
          const level = levelOf(entry.total);
          const isCurrent = entry.month === currentMonth;
          const isFuture = !!entry.future;
          return (
            <div
              key={entry.month}
              className="flex min-w-0 flex-col items-center gap-1.5"
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <div
                      className={cn(
                        "flex aspect-square w-full items-center justify-center rounded-md",
                        LEVELS[level],
                        isFuture && "opacity-40",
                        isCurrent && "ring-1 ring-accent-brand ring-offset-1"
                      )}
                    />
                  }
                >
                  {entry.total > 0 ? (
                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        // Fundo escuro pede texto invertido para manter contraste.
                        level >= 3 ? "text-background" : "text-foreground"
                      )}
                    >
                      {entry.total}
                    </span>
                  ) : null}
                </TooltipTrigger>
                <TooltipContent>
                  {monthLabel(entry.month)}
                  {isFuture
                    ? " · ainda não iniciado"
                    : `: ${entry.total} ${
                        entry.total === 1 ? "ação" : "ações"
                      }${isCurrent ? " · mês em curso" : ""}`}
                </TooltipContent>
              </Tooltip>
              <span
                className={cn(
                  "truncate text-xs text-muted-foreground",
                  isFuture && "opacity-60"
                )}
              >
                {monthLabel(entry.month)}
              </span>
              {isCurrent ? (
                <span className="text-[10px] text-accent-brand">atual</span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-xs text-muted-foreground">Menos</span>
        {LEVELS.map((level) => (
          <span key={level} className={cn("size-3 rounded-sm", level)} />
        ))}
        <span className="text-xs text-muted-foreground">Mais</span>
      </div>
    </div>
  );
}
