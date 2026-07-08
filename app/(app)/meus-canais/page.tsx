import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getChannelCards, type ChannelCard } from "@/lib/db/channels";
import { HEALTH_CONFIG } from "@/lib/plan-utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus Canais — Corteva Planner",
};

/** "Safra 2025/26" mesmo quando o banco já traz o prefixo "Safra". */
function harvestLabel(harvest: string | null): string {
  if (!harvest) return "Safra 2025/26";
  return harvest.startsWith("Safra") ? harvest : `Safra ${harvest}`;
}

/** Rank de saúde: crítico primeiro, depois atenção, depois em dia. */
function healthRank(h: ChannelCard["health"]): number {
  return h === "critico" ? 0 : h === "atencao" ? 1 : 2;
}

/** Copy do indicador de saúde: "Em dia" / "Atenção · 3 atrasadas". */
function healthLine(channel: ChannelCard): string {
  if (channel.health === "em_dia") return "Em dia";
  const label = channel.health === "critico" ? "Crítico" : "Atenção";
  if (channel.lateCount === 0) return label;
  return `${label} · ${channel.lateCount} ${channel.lateCount === 1 ? "atrasada" : "atrasadas"}`;
}

function MetricCol({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChannelCardTile({ channel }: { channel: ChannelCard }) {
  return (
    <Card className="p-0 transition-colors hover:bg-muted/40">
      <Link
        href={`/meus-canais/${channel.id}`}
        className="flex flex-col gap-4 p-6"
      >
        {/* Linha 1 — nome + safra */}
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-lg font-medium">{channel.name}</p>
          <Badge variant="outline" className="shrink-0">
            {harvestLabel(channel.harvest)}
          </Badge>
        </div>

        {/* Linha 2 — região */}
        <p className="-mt-2 text-sm text-muted-foreground">{channel.region}</p>

        {/* Linha 3 — 3 métricas */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCol value={channel.problemCount} label="problemas" />
          <MetricCol value={channel.activityCount} label="atividades" />
          <MetricCol value={`${channel.completedPercent}%`} label="concluídas" />
        </div>

        {/* Progress */}
        <Progress value={channel.completedPercent} className="h-1.5" />

        {/* Linha 4 — saúde + N filiais */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={`size-2.5 shrink-0 rounded-full ${HEALTH_CONFIG[channel.health].dotClass}`}
            />
            <span
              className={
                channel.health === "critico"
                  ? "font-medium text-red-600 dark:text-red-400"
                  : channel.health === "atencao"
                    ? "font-medium text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }
            >
              {healthLine(channel)}
            </span>
          </span>
          <span className="text-muted-foreground tabular-nums">
            {channel.branchCount}{" "}
            {channel.branchCount === 1 ? "filial" : "filiais"}
          </span>
        </div>
      </Link>
    </Card>
  );
}

/**
 * "Meus Canais" do campo — cards ricos com métricas do plano e saúde.
 * Responde "como cada um dos meus canais está indo?" — profundidade,
 * não urgência (isso mora na home).
 */
export default async function MeusCanaisPage() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const channels = await getChannelCards(channelIds);

  // Saúde: crítico > atenção > em dia; alfabético dentro do grupo.
  const sorted = [...channels].sort((a, b) => {
    const diff = healthRank(a.health) - healthRank(b.health);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  return (
    <PageShell
      title="Meus Canais"
      description="Os canais em que você atua nesta safra."
    >
      {sorted.length === 0 ? (
        <Empty className="flex-1 rounded-3xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle>Sem canais vinculados</EmptyTitle>
            <EmptyDescription>
              Fale com o time de CX para ter acesso aos distribuidores.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {sorted.map((channel) => (
            <ChannelCardTile key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
