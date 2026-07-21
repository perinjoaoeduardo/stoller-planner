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
      ? "text-destructive"
      : metrics.latePercent > 10
        ? "text-warning"
        : undefined;

  const cards = [
    {
      label: "Canais com plano ativo",
      value: metrics.channelsWithPlan.toString(),
      hint: `de ${metrics.totalChannels} canais`,
      icon: Store,
      href: "/canais",
    },
    {
      label: "Atividades da safra",
      value: metrics.totalActivities.toString(),
      hint: "Planos ativos",
      icon: ClipboardList,
      href: "/atividades",
    },
    {
      label: "Concluídas",
      value: `${metrics.completedPercent}%`,
      hint: `${metrics.completedCount} de ${metrics.totalActivities}`,
      icon: CircleCheckBig,
      href: "/atividades",
    },
    {
      label: "Atrasadas",
      value: `${metrics.latePercent}%`,
      hint: `${metrics.lateCount} atividades`,
      icon: CircleAlert,
      valueClass: lateTone,
      href: "/acompanhamento?tab=atrasadas",
    },
  ];

  const dark = metrics.darkChannelCount;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className="group">
          <Card className="h-full gap-1.5 py-4 shadow-card transition-[background-color,border-color,box-shadow] duration-base ease-standard group-hover:border-border-hover group-hover:shadow-elevated">
            <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
              <CardDescription className="text-xs">
                {card.label}
              </CardDescription>
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
        </Link>
      ))}

      <Link
        href="/acompanhamento?tab=escuro"
        className="group"
        aria-label="Ver canais no escuro no acompanhamento"
      >
        <Card
          className={cn(
            "h-full gap-1.5 py-4 shadow-card transition-[background-color,border-color,box-shadow] duration-base ease-standard group-hover:border-border-hover group-hover:shadow-elevated",
            dark > 0 &&
              "border-destructive/40 bg-destructive/5 group-hover:border-destructive/60"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
            <CardDescription
              className={cn(
                "text-xs",
                dark > 0 && "font-medium text-destructive"
              )}
            >
              Canais no escuro
            </CardDescription>
            <MoonStar
              className={cn(
                "size-4 shrink-0 text-muted-foreground",
                dark > 0 && "text-destructive"
              )}
            />
          </CardHeader>
          <CardContent className="px-4">
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight tabular-nums",
                dark > 0 && "text-destructive"
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
