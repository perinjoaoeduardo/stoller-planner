import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import {
  getChannelCards,
  getRegions,
  HEALTH_CONFIG,
  type ChannelCard,
} from "@/lib/db/channels";

import { RegionFilter } from "./region-filter";

export const dynamic = "force-dynamic";

function ChannelCardItem({ channel }: { channel: ChannelCard }) {
  const health = HEALTH_CONFIG[channel.health];

  return (
    <Link href={`/canais/${channel.id}`} className="group">
      <Card className="h-full gap-4 transition-colors group-hover:border-primary/40 group-hover:bg-muted/40">
        <CardHeader className="gap-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold leading-snug">{channel.name}</h2>
            {channel.harvest ? (
              <Badge variant="outline" className="shrink-0">
                {channel.harvest}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{channel.region}</p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-end gap-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {channel.problemCount}
              </p>
              <p className="text-xs text-muted-foreground">metas</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {channel.activityCount}
              </p>
              <p className="text-xs text-muted-foreground">atividades</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {channel.completedPercent}%
              </p>
              <p className="text-xs text-muted-foreground">concluídas</p>
            </div>
          </div>
          <Progress
            value={channel.completedPercent}
            className="[&_[data-slot=progress-track]]:h-1.5"
            aria-label={`${channel.completedPercent}% de atividades concluídas`}
          />
          <div className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={`size-2 rounded-full ${health.dotClass}`}
            />
            <span className="text-muted-foreground">
              {health.label}
              {channel.lateCount > 0 ? (
                <span className="tabular-nums">
                  {" "}
                  · {channel.lateCount}{" "}
                  {channel.lateCount === 1 ? "atrasada" : "atrasadas"}
                </span>
              ) : null}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export const metadata: Metadata = {
  title: "Canais — Corteva Planner",
};

export default async function CanaisPage({
  searchParams,
}: {
  searchParams: Promise<{ regiao?: string }>;
}) {
  const { regiao } = await searchParams;
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const isCx = profile.role === "CX";

  const [cards, regions] = await Promise.all([
    getChannelCards(channelIds),
    isCx ? getRegions() : Promise.resolve([]),
  ]);

  const filtered = regiao
    ? cards.filter((card) => card.regionId === regiao)
    : cards;

  return (
    <PageShell
      title={isCx ? "Canais" : "Meus Canais"}
      description={
        isCx
          ? "Todos os canais da safra, com saúde de execução por canal."
          : "Os canais sob sua gestão nesta safra, com saúde de execução."
      }
      actions={
        isCx ? (
          <RegionFilter
            regions={regions.map((region) => ({
              value: region.id,
              label: region.name,
            }))}
          />
        ) : undefined
      }
    >
      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Store />
                </EmptyMedia>
                <EmptyTitle>
                  {cards.length === 0
                    ? "Nenhum canal vinculado"
                    : "Nenhum canal nesta região"}
                </EmptyTitle>
                <EmptyDescription>
                  {cards.length === 0
                    ? "Você ainda não tem canais vinculados à sua carteira. Fale com o time de excelência comercial (CX)."
                    : "Nenhum canal encontrado com o filtro atual. Selecione outra região ou limpe o filtro."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((channel) => (
            <ChannelCardItem key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
