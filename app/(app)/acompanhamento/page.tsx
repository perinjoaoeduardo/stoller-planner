import type { Metadata } from "next";
import Link from "next/link";
import { MoonStar, PartyPopper } from "lucide-react";

import { ActivitiesTable } from "@/components/app/activities-table";
import { CopySummaryMenu } from "@/components/app/copy-summary-menu";
import { PageShell } from "@/components/app/page-shell";
import { PendenciasView } from "@/components/app/pendencias-view";
import { PeopleTable } from "@/components/app/people-table";
import type { SelectOption } from "@/components/app/searchable-select";
import { StatusBadge } from "@/components/app/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireCx, getScopedChannelIds } from "@/lib/auth/scope";
import { DARK_CHANNEL_DAYS } from "@/lib/config";
import { getScopedActivities } from "@/lib/db/channels";
import { getDarkChannels, getPeopleRows, type DarkChannel } from "@/lib/db/cx";
import { getPendencies } from "@/lib/db/pendencias";
import { getRegions } from "@/lib/db/channels";

export const dynamic = "force-dynamic";

function DarkChannelCard({ channel }: { channel: DarkChannel }) {
  return (
    <Card className="gap-3 border-red-500/30 py-4">
      <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
        <div className="min-w-0 space-y-0.5">
          <Link
            href={`/canais/${channel.id}`}
            className="block truncate font-semibold underline-offset-4 hover:underline"
          >
            {channel.name}
          </Link>
          <CardDescription className="truncate">
            {channel.regionName}
            {channel.dsmName ? ` · DSM ${channel.dsmName}` : ""}
          </CardDescription>
        </div>
        <CopySummaryMenu summaryText={channel.summaryText} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight text-red-600 tabular-nums dark:text-red-400">
            {channel.daysSinceExecution ?? "∞"}
          </span>
          <span className="text-sm text-muted-foreground">
            {channel.daysSinceExecution === null
              ? "nunca registrou execução nesta safra"
              : `dias desde o último registro`}
          </span>
        </div>
        {channel.openActivities.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Últimas atividades abertas
            </p>
            {channel.openActivities.map((activity) => (
              <Link
                key={activity.id}
                href={`/atividades/${activity.id}`}
                className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/60"
              >
                <span className="truncate">{activity.title}</span>
                <StatusBadge status={activity.status} className="shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sem atividades abertas no plano.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export const metadata: Metadata = {
  title: "Acompanhamento — Corteva Planner",
};

/**
 * /acompanhamento — a ferramenta de cobrança diária do CX: canais no
 * escuro, pessoas que pararam de registrar e atrasadas globais.
 */
export default async function AcompanhamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireCx();
  const { tab } = await searchParams;

  const channelIds = await getScopedChannelIds(profile);
  const [darkChannels, people, regions, activities, pendencies] =
    await Promise.all([
      getDarkChannels(),
      getPeopleRows(),
      getRegions(),
      getScopedActivities(channelIds),
      getPendencies(channelIds),
    ]);

  const lateActivities = activities.filter(
    (activity) => activity.status === "atrasada"
  );

  const dedupe = (options: SelectOption[]) => {
    const seen = new Map<string, SelectOption>();
    for (const option of options) {
      if (!seen.has(option.value)) seen.set(option.value, option);
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  };
  const problems = dedupe(
    lateActivities
      .filter((activity) => activity.problemId && activity.problemTitle)
      .map((activity) => ({
        value: activity.problemId!,
        label: activity.problemTitle!,
      }))
  );
  const branches = dedupe(
    lateActivities
      .filter((activity) => activity.branchId && activity.branchName)
      .map((activity) => ({
        value: activity.branchId!,
        label: activity.branchName!,
      }))
  );
  const responsibles = dedupe(
    lateActivities
      .filter((activity) => activity.responsibleId && activity.responsibleName)
      .map((activity) => ({
        value: activity.responsibleId!,
        label: activity.responsibleName!,
      }))
  );

  const regionOptions: SelectOption[] = regions.map((region) => ({
    value: region.id,
    label: region.name,
  }));

  const defaultTab = [
    "escuro",
    "pendencias",
    "pessoas",
    "atrasadas",
  ].includes(tab ?? "")
    ? tab
    : "escuro";

  return (
    <PageShell
      title="Acompanhamento"
      description={`Quem precisa de um toque: canais sem registro há mais de ${DARK_CHANNEL_DAYS} dias, pendências de registro, pessoas que sumiram e atrasadas.`}
    >
      <Tabs defaultValue={defaultTab}>
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="escuro">
            Canais no escuro
            <span className="ml-1 tabular-nums text-muted-foreground">
              {darkChannels.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pendencias">
            Pendências
            <span className="ml-1 tabular-nums text-muted-foreground">
              {pendencies.total}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pessoas">
            Pessoas
            <span className="ml-1 tabular-nums text-muted-foreground">
              {people.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="atrasadas">
            Atrasadas
            <span className="ml-1 tabular-nums text-muted-foreground">
              {lateActivities.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escuro" className="mt-2">
          {darkChannels.length === 0 ? (
            <Card>
              <CardContent>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <PartyPopper />
                    </EmptyMedia>
                    <EmptyTitle>Nenhum canal no escuro</EmptyTitle>
                    <EmptyDescription>
                      Todo mundo registrando! Todos os canais têm registro de
                      execução nos últimos {DARK_CHANNEL_DAYS} dias.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MoonStar className="size-4 text-red-600 dark:text-red-400" />
                {darkChannels.length === 1
                  ? "1 canal está"
                  : `${darkChannels.length} canais estão`}{" "}
                sem registro de execução há mais de {DARK_CHANNEL_DAYS} dias.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {darkChannels.map((channel) => (
                  <DarkChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendencias" className="mt-2">
          <PendenciasView data={pendencies} showDsm />
        </TabsContent>

        <TabsContent value="pessoas" className="mt-2">
          <Card className="gap-4">
            <CardHeader>
              <CardDescription>
                RTVs, RDCs e DSMs pelo último registro de execução — quem
                sumiu primeiro no topo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeopleTable data={people} regions={regionOptions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atrasadas" className="mt-2">
          <Card className="gap-4">
            <CardHeader>
              <CardDescription>
                Todas as atividades atrasadas da safra (incluindo as com prazo
                vencido), das mais antigas para as mais recentes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivitiesTable
                data={lateActivities}
                problems={problems}
                branches={branches}
                responsibles={responsibles}
                canEdit={false}
                showChannel
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
