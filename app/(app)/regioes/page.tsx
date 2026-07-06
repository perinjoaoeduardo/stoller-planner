import type { Metadata } from "next";
import Link from "next/link";
import { Map, Store, Users } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { requireCx } from "@/lib/auth/scope";
import { getRegionCards, type RegionCard } from "@/lib/db/cx";
import { HEALTH_CONFIG } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function RegionCardItem({ region }: { region: RegionCard }) {
  const health = HEALTH_CONFIG[region.health];

  return (
    <Link href={`/regioes/${region.id}`} className="group">
      <Card className="h-full gap-4 transition-colors group-hover:border-primary/40 group-hover:bg-muted/40">
        <CardHeader className="gap-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold leading-snug">{region.name}</h2>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden
                className={cn("size-2 rounded-full", health.dotClass)}
              />
              {health.label}
            </span>
          </div>
          <p className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Store className="size-3.5" />
              <span className="tabular-nums">{region.channelCount}</span>{" "}
              canais
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              <span className="tabular-nums">{region.dsmCount}</span>{" "}
              {region.dsmCount === 1 ? "DSM" : "DSMs"}
            </span>
          </p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-end gap-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {region.totalActivities}
              </p>
              <p className="text-xs text-muted-foreground">atividades</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {region.completedPercent}%
              </p>
              <p className="text-xs text-muted-foreground">concluídas</p>
            </div>
            <div>
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  region.lateCount > 0 && "text-amber-600 dark:text-amber-400"
                )}
              >
                {region.lateCount}
              </p>
              <p className="text-xs text-muted-foreground">atrasadas</p>
            </div>
          </div>
          <Progress
            value={region.completedPercent}
            className="[&_[data-slot=progress-track]]:h-1.5"
            aria-label={`${region.completedPercent}% de atividades concluídas`}
          />
          {region.darkChannelCount > 0 ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {region.darkChannelCount}{" "}
              {region.darkChannelCount === 1
                ? "canal no escuro"
                : "canais no escuro"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum canal no escuro
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export const metadata: Metadata = {
  title: "Regiões — Stoller Planner",
};

/** /regioes — visão consolidada por regional, exclusiva do CX. */
export default async function RegioesPage() {
  await requireCx();
  const regions = await getRegionCards();

  return (
    <PageShell
      title="Regiões"
      description="Execução consolidada por regional — clique para o drill-down da região."
    >
      {regions.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Map />
                </EmptyMedia>
                <EmptyTitle>Nenhuma região cadastrada</EmptyTitle>
                <EmptyDescription>
                  Cadastre regiões e canais para ver a visão consolidada.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {regions.map((region) => (
            <RegionCardItem key={region.id} region={region} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
