"use client";

import * as React from "react";
import Link from "next/link";
import { Store } from "lucide-react";

import { CanalCard } from "@/components/shared/canal-card";
import { PageShell } from "@/components/app/page-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ChannelCard } from "@/lib/db/channels";

function harvestLabel(harvest: string | null): string {
  if (!harvest) return "Safra 2025/26";
  return harvest.startsWith("Safra") ? harvest : `Safra ${harvest}`;
}

/** Rank de saúde: crítico primeiro, depois atenção, depois em dia. */
function healthRank(h: ChannelCard["health"]): number {
  return h === "critico" ? 0 : h === "atencao" ? 1 : 2;
}

function ChannelCardTile({ channel }: { channel: ChannelCard }) {
  return (
    <CanalCard
      canal={channel}
      variant="full"
      href={`/meus-canais/${channel.id}`}
    />
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

  // Contexto de safra é global da tela — deriva do primeiro canal (todos na
  // mesma safra corrente), com fallback pro rótulo padrão.
  const safraLabel = harvestLabel(channels[0]?.harvest ?? null);

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
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="text-muted-foreground font-normal"
          >
            {safraLabel}
          </Badge>
          {showRegionFilter ? (
            <SearchableSelect
              options={regionOptions}
              value={regionId}
              onValueChange={setRegionId}
              placeholder="Todas as regiões"
              className="h-10 min-w-52 border-border bg-card"
            />
          ) : null}
        </div>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((channel) => (
            <ChannelCardTile key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
