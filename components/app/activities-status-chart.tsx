"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { ActivityStatus } from "@/components/shared/status-badge";
import {
  STATUS_CHART_COLORS,
  STATUS_LABELS,
} from "@/components/shared/status-badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Distribuição POR STATUS: cada barra na cor canônica do próprio status
// (STATUS_CHART_COLORS) — a mesma usada em qualquer gráfico de status.
const chartConfig = {
  total: { label: "Atividades" },
  planejada: { label: "Planejada", color: STATUS_CHART_COLORS.planejada },
  concluida: { label: "Concluída", color: STATUS_CHART_COLORS.concluida },
  atrasada: { label: "Atrasada", color: STATUS_CHART_COLORS.atrasada },
  nao_feita: { label: "Cancelada", color: STATUS_CHART_COLORS.nao_feita },
} satisfies ChartConfig;

export function ActivitiesStatusChart({
  data,
}: {
  data: { status: ActivityStatus; total: number }[];
}) {
  const chartData = data.map((item) => ({
    ...item,
    label: STATUS_LABELS[item.status],
    fill: `var(--color-${item.status})`,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="total" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}
