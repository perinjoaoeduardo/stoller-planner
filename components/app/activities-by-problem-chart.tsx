"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  total: { label: "Atividades", color: "var(--chart-2)" },
} satisfies ChartConfig;

export type ProblemChartDatum = {
  label: string;
  total: number;
  unlinked?: boolean;
};

/**
 * Barras horizontais de atividades por problema. A categoria
 * "Sem problema vinculado" entra sempre que existir débito de vínculo.
 */
export function ActivitiesByProblemChart({
  data,
}: {
  data: ProblemChartDatum[];
}) {
  const height = Math.max(160, data.length * 44);

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
        <Bar dataKey="total" fill="var(--color-total)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}
