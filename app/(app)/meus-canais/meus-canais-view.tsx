"use client";

import * as React from "react";
import Link from "next/link";
import { Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
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
import type { ChannelCard } from "@/lib/db/channels";
import { HEALTH_CONFIG } from "@/lib/plan-utils";

function harvestLabel(harvest: string | null): string {
  if (!harvest) return "Safra 2025/26";
  return harvest.startsWith("Safra") ? harvest : `Safra ${harvest}`;
}

/** Rank de saúde: crítico primeiro, depois atenção, depois em dia. */
function healthRank(h: ChannelCard["health"]): number {
  return h === "critico" ? 0 : h === "atencao" ? 1 : 2;
}

function healthLine(channel: ChannelCard): string {
  if (channel.health === "em_dia") return "Em dia";
  const label = channel.health === "critico" ? "Crítico" : "Atenção";
  if (channel.lateCount === 0) return label;
  return `${label} · ${channel.lateCount} ${channel.lateCount === 1 ? "atrasada" : "atrasadas"}`;
}

function MetricCol({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
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
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-lg font-medium">{channel.name}</p>
          <Badge variant="outline" className="shrink-0">
            {harvestLabel(channel.harvest)}
          </Badge>
        </div>

        <p className="-mt-2 text-sm text-muted-foreground">{channel.region}</p>

        <div className="grid grid-cols-3 gap-4">
          <MetricCol value={channel.problemCount} label="problemas" />
          <MetricCol value={channel.activityCount} label="atividades" />
          <MetricCol
            value={`${channel.completedPercent}%`}
            label="concluídas"
          />
        </div>

        <Progress value={channel.completedPercent} className="h-1.5" />

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
 * Meus Canais do RTV — grid de cards ricos + filtro de região opcional
 * (só aparece quando o RTV atua em 2+ regiões diferentes).
 */
export function MeusCanaisView({ channels }: { channels: ChannelCard[] }) {
  const [regionId, setRegionId] = React.useState<string | null>(null);

  // Regiões únicas ordenadas por nome. O filtro só aparece se ha 2+.
  const regions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const channel of channels) {
      if (channel.regionId && !map.has(channel.regionId)) {
        map.set(channel.regionId, channel.region);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [channels]);

  const showRegionFilter = regions.length > 1;

  const regionOptions: SelectOption[] = React.useMemo(
    () =>
      regions.map((region) => ({ value: region.id, label: region.name })),
    [regions]
  );

  const filtered = React.useMemo(() => {
    if (!regionId) return channels;
    return channels.filter((channel) => channel.regionId === regionId);
  }, [channels, regionId]);

  // Ordenação: crítico > atenção > em dia; alfabético dentro do grupo.
  const sorted = React.useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const diff = healthRank(a.health) - healthRank(b.health);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }),
    [filtered]
  );

  return (
    <PageShell
      title="Meus Canais"
      description="Os canais em que você atua nesta safra."
      actions={
        showRegionFilter ? (
          <SearchableSelect
            options={regionOptions}
            value={regionId}
            onValueChange={setRegionId}
            placeholder="Todas as regiões"
            className="h-10 min-w-52"
          />
        ) : null
      }
    >
      {channels.length === 0 ? (
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
      ) : sorted.length === 0 ? (
        <Empty className="rounded-3xl border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle>Nenhum canal nessa região</EmptyTitle>
            <EmptyDescription>
              Nenhum dos seus canais está na região selecionada.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((channel) => (
            <ChannelCardTile key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
