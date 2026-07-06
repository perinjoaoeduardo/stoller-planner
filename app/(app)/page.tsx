import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  Store,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { PageShell } from "@/components/app/page-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import {
  getChannelsSummary,
  getDashboardData,
  getMyUpcomingActivities,
  type DashboardData,
} from "@/lib/db/dashboard";

export const dynamic = "force-dynamic";

function formatDueDate(date: string | null) {
  if (!date) return "—";
  return format(parseISO(date), "dd MMM yyyy", { locale: ptBR });
}

function MetricsGrid({
  data,
  scopeHint,
}: {
  data: DashboardData;
  scopeHint: string;
}) {
  const metrics = [
    {
      label: "Total de atividades",
      value: data.totalActivities.toString(),
      hint: scopeHint,
      icon: ClipboardList,
    },
    {
      label: "Concluídas",
      value: `${data.completedPercent}%`,
      hint: `${data.completedCount} de ${data.totalActivities} atividades`,
      icon: CircleCheckBig,
    },
    {
      label: "Atrasadas",
      value: data.overdueCount.toString(),
      hint: "Exigem ação imediata",
      icon: CircleAlert,
    },
    {
      label: "Canais ativos",
      value: data.activeChannels.toString(),
      hint: "Com plano ativo na safra",
      icon: Store,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardDescription>{metric.label}</CardDescription>
            <metric.icon className="size-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusChartCard({ data }: { data: DashboardData }) {
  return (
    <Card className="xl:col-span-3">
      <CardHeader>
        <CardTitle>Atividades por status</CardTitle>
        <CardDescription>
          Distribuição das atividades da safra em cada status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActivitiesStatusChart data={data.byStatus} />
      </CardContent>
    </Card>
  );
}

function UpcomingTableCard({ data }: { data: DashboardData }) {
  return (
    <Card className="xl:col-span-4">
      <CardHeader>
        <CardTitle>Próximas do vencimento</CardTitle>
        <CardDescription>
          As 10 atividades pendentes com prazo mais próximo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atividade</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.upcoming.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="max-w-64 truncate font-medium">
                  {activity.title}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {activity.channel}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {activity.responsible}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatDueDate(activity.dueDate)}
                </TableCell>
                <TableCell className="text-right">
                  <StatusBadge status={activity.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** Home do CX — visão global, idêntica ao total do banco. */
async function CxHome() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const data = await getDashboardData(channelIds);

  return (
    <PageShell
      title="Visão geral — todas as regiões"
      description="Execução comercial de todos os canais na safra 2025/26."
    >
      <MetricsGrid data={data} scopeHint="Safra 2025/26, todos os canais" />
      <div className="grid gap-4 xl:grid-cols-7">
        <StatusChartCard data={data} />
        <UpcomingTableCard data={data} />
      </div>
    </PageShell>
  );
}

/** Home do DSM — métricas restritas aos canais linkados. */
async function DsmHome() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const [data, channels] = await Promise.all([
    getDashboardData(channelIds),
    getChannelsSummary(channelIds),
  ]);

  return (
    <PageShell
      title="Início"
      description="Execução comercial dos seus canais na safra 2025/26."
    >
      <MetricsGrid data={data} scopeHint="Safra 2025/26, seus canais" />
      <div className="grid gap-4 xl:grid-cols-7">
        <div className="flex flex-col gap-4 xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Meus canais</CardTitle>
              <CardDescription>
                Canais sob sua gestão nesta safra.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ItemGroup>
                {channels.map((channel, index) => (
                  <div key={channel.id}>
                    {index > 0 ? <ItemSeparator /> : null}
                    <Item
                      size="sm"
                      render={<Link href="/canais" />}
                      className="hover:bg-muted/60"
                    >
                      <ItemMedia variant="icon">
                        <Store />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{channel.name}</ItemTitle>
                        <ItemDescription>
                          {channel.region} ·{" "}
                          <span className="tabular-nums">
                            {channel.branchCount}
                          </span>{" "}
                          filiais
                        </ItemDescription>
                      </ItemContent>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Item>
                  </div>
                ))}
              </ItemGroup>
            </CardContent>
          </Card>
          <StatusChartCard data={data} />
        </div>
        <UpcomingTableCard data={data} />
      </div>
    </PageShell>
  );
}

/** Home de RTV/RDC — mobile-first: minhas atividades + ação rápida. */
async function FieldHome() {
  const profile = await getCurrentProfile();
  const activities = await getMyUpcomingActivities(profile.id);

  return (
    <PageShell
      title="Início"
      description="Suas atividades em campo na safra 2025/26."
      className="mx-auto w-full max-w-2xl"
    >
      <Button
        size="lg"
        className="h-12 w-full text-base"
        nativeButton={false}
        render={
          <Link href="/registrar-execucao">
            <ClipboardCheck className="size-5" />
            Registrar execução
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Minhas próximas atividades</CardTitle>
          <CardDescription>
            Atividades em que você é o responsável, por prazo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList />
                </EmptyMedia>
                <EmptyTitle>Nada pendente por aqui</EmptyTitle>
                <EmptyDescription>
                  Você não tem atividades pendentes sob sua
                  responsabilidade nesta safra.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup>
              {activities.map((activity, index) => (
                <div key={activity.id}>
                  {index > 0 ? <ItemSeparator /> : null}
                  <Item size="sm" className="min-h-11">
                    <ItemContent>
                      <ItemTitle className="line-clamp-1">
                        {activity.title}
                      </ItemTitle>
                      <ItemDescription>
                        {activity.branch} · {activity.channel}
                      </ItemDescription>
                    </ItemContent>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={activity.status} />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDueDate(activity.dueDate)}
                      </span>
                    </div>
                  </Item>
                </div>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (profile.role === "CX") return <CxHome />;
  if (profile.role === "DSM") return <DsmHome />;
  return <FieldHome />;
}
