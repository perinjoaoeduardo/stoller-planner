"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { PulseDatum } from "@/lib/db/cx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  total: { label: "Registros", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * A "pulsação" do sistema: registros de execução por semana nas últimas
 * 12 semanas. Se a linha cai, o time parou de registrar.
 */
export function ExecutionPulseChart({ data }: { data: PulseDatum[] }) {
  const chartData = data.map((datum) => ({
    ...datum,
    label: format(parseISO(datum.weekStart), "dd MMM", { locale: ptBR }),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Semana de ${label}`}
            />
          }
        />
        <Line
          dataKey="total"
          type="monotone"
          stroke="var(--color-total)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-total)" }}
        />
      </LineChart>
    </ChartContainer>
  );
}
