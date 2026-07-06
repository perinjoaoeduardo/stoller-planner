import Link from "next/link";
import {
  CircleAlert,
  CircleCheckBig,
  ClipboardList,
  MoonStar,
  Store,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import type { CxMetrics } from "@/lib/db/cx";
import { cn } from "@/lib/utils";

/**
 * Linha de métricas da visão CX (nacional em /visao-geral, filtrada em
 * /regioes/[id]). O card "no escuro" é o card estrela: vermelho quando
 * > 0 e clicável, levando direto ao /acompanhamento.
 */
export function CxMetricCards({ metrics }: { metrics: CxMetrics }) {
  const lateTone =
    metrics.latePercent > 30
      ? "text-red-600 dark:text-red-400"
      : metrics.latePercent > 10
        ? "text-amber-600 dark:text-amber-400"
        : undefined;

  const cards = [
    {
      label: "Canais com plano ativo",
      value: metrics.channelsWithPlan.toString(),
      hint: `de ${metrics.totalChannels} canais`,
      icon: Store,
    },
    {
      label: "Atividades da safra",
      value: metrics.totalActivities.toString(),
      hint: "Planos ativos",
      icon: ClipboardList,
    },
    {
      label: "Concluídas",
      value: `${metrics.completedPercent}%`,
      hint: `${metrics.completedCount} de ${metrics.totalActivities}`,
      icon: CircleCheckBig,
    },
    {
      label: "Atrasadas",
      value: `${metrics.latePercent}%`,
      hint: `${metrics.lateCount} atividades`,
      icon: CircleAlert,
      valueClass: lateTone,
    },
  ];

  const dark = metrics.darkChannelCount;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} className="gap-1.5 py-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
            <CardDescription className="text-xs">{card.label}</CardDescription>
            <card.icon className="size-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4">
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight tabular-nums",
                card.valueClass
              )}
            >
              {card.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {card.hint}
            </p>
          </CardContent>
        </Card>
      ))}

      <Link
        href="/acompanhamento?tab=escuro"
        className="group"
        aria-label="Ver canais no escuro no acompanhamento"
      >
        <Card
          className={cn(
            "h-full gap-1.5 py-4 transition-colors group-hover:border-primary/40 group-hover:bg-muted/40",
            dark > 0 &&
              "border-red-500/40 bg-red-500/5 group-hover:border-red-500/60 group-hover:bg-red-500/10"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
            <CardDescription
              className={cn(
                "text-xs",
                dark > 0 && "font-medium text-red-600 dark:text-red-400"
              )}
            >
              Canais no escuro
            </CardDescription>
            <MoonStar
              className={cn(
                "size-4 shrink-0 text-muted-foreground",
                dark > 0 && "text-red-600 dark:text-red-400"
              )}
            />
          </CardHeader>
          <CardContent className="px-4">
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight tabular-nums",
                dark > 0 && "text-red-600 dark:text-red-400"
              )}
            >
              {dark}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              sem registro há &gt;{DARK_CHANNEL_DAYS} dias
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
