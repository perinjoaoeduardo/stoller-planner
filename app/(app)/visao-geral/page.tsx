import { Activity, ChartColumnStacked } from "lucide-react";

import { ChannelHealthTable } from "@/components/app/channel-health-table";
import { CxMetricCards } from "@/components/app/cx-metric-cards";
import { ExecutionPulseChart } from "@/components/app/execution-pulse-chart";
import { PageShell } from "@/components/app/page-shell";
import { RegionStatusChart } from "@/components/app/region-status-chart";
import type { SelectOption } from "@/components/app/searchable-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCx } from "@/lib/auth/scope";
import {
  getChannelHealthRows,
  getCxMetrics,
  getExecutionPulse,
  getRegionStatusData,
} from "@/lib/db/cx";

export const dynamic = "force-dynamic";

/**
 * Painel geral CX — o radar nacional. Responde "quem precisa da minha
 * atenção agora?": métricas nacionais, gargalo por região, pulsação de
 * registros e a tabela de saúde por canal com os piores primeiro.
 */
export default async function VisaoGeralPage() {
  await requireCx();

  const [metrics, regionData, pulse, healthRows] = await Promise.all([
    getCxMetrics(),
    getRegionStatusData(),
    getExecutionPulse(12),
    getChannelHealthRows(),
  ]);

  const dedupe = (options: SelectOption[]) => {
    const seen = new Map<string, SelectOption>();
    for (const option of options) {
      if (!seen.has(option.value)) seen.set(option.value, option);
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  };

  const regions = dedupe(
    healthRows.map((row) => ({ value: row.regionId, label: row.regionName }))
  );
  const dsms = dedupe(
    healthRows
      .filter((row) => row.dsmId && row.dsmName)
      .map((row) => ({ value: row.dsmId!, label: row.dsmName! }))
  );

  return (
    <PageShell
      title="Visão geral"
      description="Radar nacional da execução comercial — Safra 2025/26, todas as regiões."
    >
      <CxMetricCards metrics={metrics} />

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartColumnStacked className="size-4 text-muted-foreground" />
              Atividades por região
            </CardTitle>
            <CardDescription>
              Status derivado das atividades da safra em cada regional — onde
              está o gargalo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegionStatusChart data={regionData} />
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              Pulsação de registros
            </CardTitle>
            <CardDescription>
              Registros de execução por semana nas últimas 12 semanas — se a
              linha cai, o time parou de registrar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExecutionPulseChart data={pulse} />
          </CardContent>
        </Card>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Saúde por canal</CardTitle>
          <CardDescription>
            Todos os canais da safra, dos piores para os melhores — sem
            registro há mais tempo primeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelHealthTable data={healthRows} regions={regions} dsms={dsms} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
