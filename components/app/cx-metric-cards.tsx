import { StatCard } from "@/components/shared/stat-card";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import type { CxMetrics } from "@/lib/db/cx";

/**
 * Linha de métricas da visão CX (nacional em /visao-geral, filtrada em
 * /regioes/[id]). Usa o StatCard canônico — mesma anatomia dos stat
 * cards do RTV e do DSM. Uma cor só de alarme (âmbar): "atrasadas" e
 * "no escuro" acendem quando pedem atenção; sem vermelho de escalada e
 * sem ícone decorativo — o rótulo e o número já dizem tudo.
 */
export function CxMetricCards({ metrics }: { metrics: CxMetrics }) {
  const dark = metrics.darkChannelCount;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        title="Canais com plano ativo"
        value={metrics.channelsWithPlan}
        sublabel={`de ${metrics.totalChannels} canais`}
        href="/canais"
      />
      <StatCard
        title="Atividades da safra"
        value={metrics.totalActivities}
        sublabel="Planos ativos"
        href="/atividades"
      />
      <StatCard
        title="Concluídas"
        value={`${metrics.completedPercent}%`}
        sublabel={`${metrics.completedCount} de ${metrics.totalActivities}`}
        href="/atividades"
      />
      <StatCard
        title="Atrasadas"
        value={`${metrics.latePercent}%`}
        sublabel={`${metrics.lateCount} atividades`}
        tone={metrics.latePercent > 10 ? "warning" : "neutral"}
        href="/acompanhamento?tab=atrasadas"
      />
      <StatCard
        title="Canais no escuro"
        value={dark}
        sublabel={`sem registro há >${DARK_CHANNEL_DAYS} dias`}
        tone={dark > 0 ? "warning" : "neutral"}
        href="/acompanhamento?tab=escuro"
        className={
          dark > 0
            ? "border-warning/40 bg-warning-bg/40 hover:border-warning/60"
            : undefined
        }
      />
    </div>
  );
}
