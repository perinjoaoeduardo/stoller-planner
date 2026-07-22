import {
  CircleAlert,
  CircleCheckBig,
  ClipboardList,
  MoonStar,
  Store,
} from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import type { CxMetrics } from "@/lib/db/cx";

/**
 * Linha de métricas da visão CX (nacional em /visao-geral, filtrada em
 * /regioes/[id]). Usa o StatCard canônico — mesma anatomia dos stat
 * cards do RTV e do DSM. O card "no escuro" é o card estrela: quando
 * > 0 ganha tom danger e tinta destructive no próprio card, levando
 * direto ao /acompanhamento.
 */
export function CxMetricCards({ metrics }: { metrics: CxMetrics }) {
  const lateTone =
    metrics.latePercent > 30
      ? "danger"
      : metrics.latePercent > 10
        ? "warning"
        : "neutral";

  const dark = metrics.darkChannelCount;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        title="Canais com plano ativo"
        value={metrics.channelsWithPlan}
        sublabel={`de ${metrics.totalChannels} canais`}
        icon={Store}
        href="/canais"
      />
      <StatCard
        title="Atividades da safra"
        value={metrics.totalActivities}
        sublabel="Planos ativos"
        icon={ClipboardList}
        href="/atividades"
      />
      <StatCard
        title="Concluídas"
        value={`${metrics.completedPercent}%`}
        sublabel={`${metrics.completedCount} de ${metrics.totalActivities}`}
        icon={CircleCheckBig}
        href="/atividades"
      />
      <StatCard
        title="Atrasadas"
        value={`${metrics.latePercent}%`}
        sublabel={`${metrics.lateCount} atividades`}
        icon={CircleAlert}
        tone={lateTone}
        href="/acompanhamento?tab=atrasadas"
      />
      <StatCard
        title="Canais no escuro"
        value={dark}
        sublabel={`sem registro há >${DARK_CHANNEL_DAYS} dias`}
        icon={MoonStar}
        tone={dark > 0 ? "danger" : "neutral"}
        href="/acompanhamento?tab=escuro"
        className={
          dark > 0
            ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
            : undefined
        }
      />
    </div>
  );
}
