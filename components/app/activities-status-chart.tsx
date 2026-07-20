"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { ActivityStatus } from "@/components/shared/status-badge";
import { STATUS_LABELS } from "@/components/shared/status-badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Distribuição POR STATUS: cada barra na cor semântica do próprio
// status (não na paleta genérica chart-1..5). Nada de azul saturado —
// os abertos são neutros, concluída = verde, atrasada = âmbar.
const chartConfig = {
  total: { label: "Atividades" },
  planejada: { label: "Planejada", color: "var(--border-active)" },
  concluida: { label: "Concluída", color: "var(--success)" },
  atrasada: { label: "Atrasada", color: "var(--warning)" },
  nao_feita: { label: "Cancelada", color: "var(--border-hover)" },
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
