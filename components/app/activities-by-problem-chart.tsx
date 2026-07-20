"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  total: { label: "Atividades", color: "var(--chart-1)" },
} satisfies ChartConfig;

export type ProblemChartDatum = {
  label: string;
  total: number;
  unlinked?: boolean;
};

/**
 * Barras horizontais de atividades por problema/categoria.
 *
 * Cor não é decoração: por padrão TODAS as barras são neutras e apenas
 * uma recebe destaque (`highlight`) — pintar seis barras da mesma cor
 * não informa nada. `highlightTone="warning"` serve para apontar o item
 * que precisa de atenção (menor execução) em vez do maior volume.
 */
export function ActivitiesByProblemChart({
  data,
  highlightIndex = null,
  highlightTone = "brand",
}: {
  data: ProblemChartDatum[];
  /** Índice da única barra destacada. null = todas neutras. */
  highlightIndex?: number | null;
  highlightTone?: "brand" | "warning";
}) {
  const height = Math.max(160, data.length * 44);
  const highlightColor =
    highlightTone === "warning" ? "var(--warning)" : "var(--accent-brand)";

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={180}
          tick={{ fontSize: 12 }}
          tickFormatter={(value: string) =>
            value.length > 26 ? `${value.slice(0, 26)}…` : value
          }
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel={false} />}
        />
        <Bar dataKey="total" radius={6}>
          {data.map((entry, index) => (
            <Cell
              key={entry.label}
              fill={
                index === highlightIndex
                  ? highlightColor
                  : "var(--muted-foreground)"
              }
              fillOpacity={index === highlightIndex ? 1 : 0.5}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
