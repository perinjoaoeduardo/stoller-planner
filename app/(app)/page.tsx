import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Camera,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  Store,
} from "lucide-react";
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { FieldActivityCard } from "@/components/app/field-activity-card";
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
  type DashboardData,
} from "@/lib/db/dashboard";
import {
  getFieldActivities,
  getMyRecentExecutions,
  OPEN_STATUSES,
} from "@/lib/db/execution";

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
                      render={<Link href={`/canais/${channel.id}`} />}
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

/** Saudação por horário: bom dia / boa tarde / boa noite. */
function greetingByHour(): string {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date())
  );
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Home de RTV/RDC — mobile-first: herói com saudação e contagem do
 * dia, CTA grande de registro, próximas atividades e registros
 * recentes.
 */
async function FieldHome() {
  const profile = await getCurrentProfile();
  const [{ activities }, recentExecutions] = await Promise.all([
    getFieldActivities(profile),
    getMyRecentExecutions(profile.id, 2),
  ]);

  const firstName = profile.fullName.split(" ")[0];
  const open = activities.filter((activity) =>
    OPEN_STATUSES.includes(activity.status)
  );
  const lateCount = open.filter(
    (activity) => activity.status === "atrasada"
  ).length;
  const dueThisWeek = open.filter(
    (activity) =>
      activity.status !== "atrasada" &&
      activity.dueDate !== null &&
      differenceInCalendarDays(parseISO(activity.dueDate), new Date()) <= 7
  ).length;

  const urgent = [...open]
    .sort((a, b) => {
      if (a.dueDate === b.dueDate) return 0;
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    })
    .slice(0, 3);

  const summaryParts: string[] = [];
  if (lateCount > 0) {
    summaryParts.push(
      lateCount === 1
        ? "1 atividade atrasada"
        : `${lateCount} atividades atrasadas`
    );
  }
  if (dueThisWeek > 0) {
    summaryParts.push(
      dueThisWeek === 1
        ? "1 atividade vence esta semana"
        : `${dueThisWeek} atividades vencem esta semana`
    );
  }
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" e ")
      : "Nada vencendo esta semana — bom trabalho";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {greetingByHour()}, {firstName}
        </h1>
        <p
          className={
            lateCount > 0
              ? "text-sm font-medium text-amber-600 dark:text-amber-400"
              : "text-sm text-muted-foreground"
          }
        >
          {summary}.
        </p>
      </header>

      <Button
        size="lg"
        className="h-14 w-full text-base font-semibold"
        nativeButton={false}
        render={
          <Link href="/registrar">
            <Camera className="size-5" />
            Registrar execução
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Próximas</CardTitle>
          <CardDescription>
            As 3 atividades mais urgentes do seu campo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {urgent.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList />
                </EmptyMedia>
                <EmptyTitle>Nada pendente por aqui</EmptyTitle>
                <EmptyDescription>
                  Você não tem atividades abertas no seu escopo nesta safra.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {urgent.map((activity) => (
                <FieldActivityCard key={activity.id} activity={activity} />
              ))}
              <Button
                variant="ghost"
                className="h-11 justify-center text-muted-foreground"
                nativeButton={false}
                render={
                  <Link href="/minhas-atividades">
                    Ver todas
                    <ChevronRight className="size-4" />
                  </Link>
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {recentExecutions.length > 0 ? (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardDescription className="flex items-center gap-1.5">
              <ClipboardCheck className="size-3.5" />
              Registros recentes
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <ItemGroup>
              {recentExecutions.map((execution, index) => (
                <div key={execution.id}>
                  {index > 0 ? <ItemSeparator /> : null}
                  <Item
                    size="sm"
                    render={<Link href={`/atividades/${execution.activityId}`} />}
                    className="hover:bg-muted/60"
                  >
                    <ItemContent>
                      <ItemTitle className="line-clamp-1">
                        {execution.activityTitle}
                      </ItemTitle>
                      <ItemDescription className="line-clamp-1">
                        {formatDistanceToNow(parseISO(execution.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </ItemDescription>
                    </ItemContent>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Item>
                </div>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export const metadata: Metadata = {
  title: "Início — Corteva Planner",
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  // O "Início" do CX é o painel geral do Bloco 5.
  if (profile.role === "CX") redirect("/visao-geral");
  if (profile.role === "DSM") return <DsmHome />;
  return <FieldHome />;
}
