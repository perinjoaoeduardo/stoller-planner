import { StatCard } from "@/components/shared/stat-card";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import type { CxMetrics } from "@/lib/db/cx";

/**
 * Linha de métricas da visão CX (nacional em /visao-geral, filtrada em
 * /regioes/[id]). Usa o StatCard canônico — mesma anatomia dos stat
 * cards do RTV e do DSM. Uma cor só de alarme (âmbar): "atrasadas" e
 * "no escuro" acendem quando pedem atenção; sem vermelho de escalada e
 * sem ícone decorativo — o rótulo e o número já dizem tudo.
 *
 * Só linka o que o CX consegue navegar: "atividades da safra" e
 * "concluídas" ficam como número puro (o CX não tem a aba /atividades —
 * clicar caía numa tela sem volta). Os demais levam a destinos reais.
 *
 * `linkable=false` (drill-down de região): os destinos são nacionais e
 * perderiam o recorte da região — então na região os cards viram só
 * número; o drill de verdade é a tabela de saúde por canal abaixo.
 */
export function CxMetricCards({
  metrics,
  linkable = true,
}: {
  metrics: CxMetrics;
  linkable?: boolean;
}) {
  const dark = metrics.darkChannelCount;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        title="Canais com plano ativo"
        value={metrics.channelsWithPlan}
        sublabel={`de ${metrics.totalChannels} canais`}
        href={linkable ? "/canais" : undefined}
      />
      <StatCard
        title="Atividades da safra"
        value={metrics.totalActivities}
        sublabel="Planos ativos"
      />
      <StatCard
        title="Concluídas"
        value={`${metrics.completedPercent}%`}
        sublabel={`${metrics.completedCount} de ${metrics.totalActivities}`}
        tone="success"
      />
      <StatCard
        title="Atrasadas"
        value={`${metrics.latePercent}%`}
        sublabel={`${metrics.lateCount} atividades`}
        tone={metrics.latePercent > 10 ? "warning" : "neutral"}
        href={linkable ? "/acompanhamento?tab=atrasadas" : undefined}
      />
      <StatCard
        title="Canais no escuro"
        value={dark}
        sublabel={`sem registro há >${DARK_CHANNEL_DAYS} dias`}
        tone={dark > 0 ? "warning" : "neutral"}
        href={linkable ? "/acompanhamento?tab=escuro" : undefined}
        className={
          dark > 0
            ? "border-warning/40 bg-warning-bg/40 hover:border-warning/60"
            : undefined
        }
      />
    </div>
  );
}
