"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  total: { label: "Registros", color: "var(--chart-2)" },
} satisfies ChartConfig;

export type MonthlyDatum = { month: string; total: number };

/**
 * Registros de execução por mês — a "pulsação" da safra agregada
 * mensalmente para o Relatório de Safra.
 */
export function MonthlyRegistrationsChart({ data }: { data: MonthlyDatum[] }) {
  const chartData = data.map((datum) => ({
    ...datum,
    label: format(parseISO(`${datum.month}-01`), "MMM yy", { locale: ptBR }),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Registros em ${label}`}
            />
          }
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={6} maxBarSize={56} />
      </BarChart>
    </ChartContainer>
  );
}
