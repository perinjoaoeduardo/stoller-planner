"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { RegionStatusDatum } from "@/lib/db/cx";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  concluida: { label: "Concluída", color: "var(--chart-3)" },
  planejada: { label: "Planejada", color: "var(--chart-1)" },
  atrasada: { label: "Atrasada", color: "var(--chart-4)" },
  nao_feita: { label: "Cancelada", color: "var(--chart-5)" },
} satisfies ChartConfig;

const STACK_KEYS = [
  "concluida",
  "planejada",
  "atrasada",
  "nao_feita",
] as const;

/**
 * Barras empilhadas de atividades por região, quebradas por status
 * derivado — o bird's eye do gargalo nacional no painel CX.
 */
export function RegionStatusChart({ data }: { data: RegionStatusDatum[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="region"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {STACK_KEYS.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="status"
            fill={`var(--color-${key})`}
            radius={
              index === STACK_KEYS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
            }
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
