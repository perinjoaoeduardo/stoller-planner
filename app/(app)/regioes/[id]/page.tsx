import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChannelHealthTable } from "@/components/app/channel-health-table";
import { CxMetricCards } from "@/components/app/cx-metric-cards";
import { PageShell } from "@/components/app/page-shell";
import type { SelectOption } from "@/components/app/searchable-select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { requireCx } from "@/lib/auth/scope";
import { getChannelHealthRows, getRegionDetail } from "@/lib/db/cx";

export const dynamic = "force-dynamic";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${
    parts.length > 1 ? parts[parts.length - 1][0] : ""
  }`.toUpperCase();
}

export const metadata: Metadata = {
  title: "Região — Stoller Planner",
};

/** /regioes/[id] — drill-down da região: métricas, canais e DSMs. */
export default async function RegiaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCx();
  const { id } = await params;

  const [region, healthRows] = await Promise.all([
    getRegionDetail(id),
    getChannelHealthRows(id),
  ]);
  if (!region) notFound();

  const dsms: SelectOption[] = region.dsms.map((dsm) => ({
    value: dsm.id,
    label: dsm.name,
  }));

  return (
    <PageShell
      title={region.name}
      description="Drill-down da região: métricas, saúde por canal e DSMs responsáveis."
      breadcrumb={
        <Breadcrumb className="mb-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/regioes" />}>
                Regiões
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{region.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <CxMetricCards metrics={region.metrics} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="gap-4 xl:col-span-2">
          <CardHeader>
            <CardTitle>Saúde por canal</CardTitle>
            <CardDescription>
              Canais da região, dos piores para os melhores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChannelHealthTable data={healthRows} dsms={dsms} />
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>DSMs da região</CardTitle>
            <CardDescription>
              Gestores dos canais e conclusão agregada de cada carteira.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup>
              {region.dsms.map((dsm, index) => (
                <div key={dsm.id}>
                  {index > 0 ? <ItemSeparator /> : null}
                  <Item size="sm">
                    <ItemMedia>
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(dsm.name)}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{dsm.name}</ItemTitle>
                      <ItemDescription>
                        <span className="tabular-nums">{dsm.channelCount}</span>{" "}
                        {dsm.channelCount === 1 ? "canal" : "canais"} ·{" "}
                        <span className="tabular-nums">
                          {dsm.completedPercent}%
                        </span>{" "}
                        concluídas
                      </ItemDescription>
                    </ItemContent>
                    <div className="w-20">
                      <Progress
                        value={dsm.completedPercent}
                        className="[&_[data-slot=progress-track]]:h-1.5"
                        aria-label={`${dsm.completedPercent}% concluídas`}
                      />
                    </div>
                  </Item>
                </div>
              ))}
              {region.dsms.length === 0 ? (
                <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <UserRound className="size-4" />
                  Nenhum DSM vinculado aos canais desta região.
                </p>
              ) : null}
            </ItemGroup>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
