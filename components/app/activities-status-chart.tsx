"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { ActivityStatus } from "@/components/app/status-badge";
import { STATUS_LABELS } from "@/components/app/status-badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  total: { label: "Atividades" },
  planejada: { label: "Planejada", color: "var(--chart-1)" },
  em_andamento: { label: "Em andamento", color: "var(--chart-2)" },
  concluida: { label: "Concluída", color: "var(--chart-3)" },
  atrasada: { label: "Atrasada", color: "var(--chart-4)" },
  nao_feita: { label: "Não feita", color: "var(--chart-5)" },
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
