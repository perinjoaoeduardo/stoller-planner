import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  ListTodo,
  Store,
} from "lucide-react";
import {
  differenceInCalendarDays,
  differenceInDays,
  format,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { PageShell } from "@/components/app/page-shell";
import { RtvActivitiesTable } from "@/components/app/rtv-activities-table";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getChannelCards, type ChannelCard } from "@/lib/db/channels";
import {
  getChannelsSummary,
  getDashboardData,
  type DashboardData,
} from "@/lib/db/dashboard";
import {
  getFieldActivities,
  getMyRecentExecutions,
  OPEN_STATUSES,
  type FieldActivity,
  type RecentExecution,
} from "@/lib/db/execution";
import { HEALTH_CONFIG } from "@/lib/plan-utils";
import { greetingByHour, greetingContextLine } from "@/lib/rtv/greeting";

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

/** Hora atual em São Paulo (0–23) para a saudação. */
function currentHourInSaoPaulo(): number {
  return Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date())
  );
}

/** URL pública direta do bucket activity-photos (o bucket é public). */
function photoPublicUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/activity-photos/${storagePath}`;
}

function RtvMetrics({
  openCount,
  completedCount,
  totalCount,
  lateCount,
  channelCount,
}: {
  openCount: number;
  completedCount: number;
  totalCount: number;
  lateCount: number;
  channelCount: number;
}) {
  const cards = [
    {
      label: "Minhas atividades",
      value: openCount,
      hint: "abertas na safra",
      icon: ListTodo,
      tone: "default" as const,
      href: "/minhas-atividades?status=abertas",
    },
    {
      label: "Concluídas",
      value: completedCount,
      hint: `de ${totalCount} atividades`,
      icon: CheckCircle2,
      tone: "default" as const,
      href: "/minhas-atividades?status=concluidas",
    },
    {
      label: "Precisam de atenção",
      value: lateCount,
      hint: lateCount === 1 ? "atrasada" : "atrasadas",
      icon: AlertCircle,
      tone: lateCount > 0 ? ("alert" as const) : ("default" as const),
      href: "/minhas-atividades?status=atrasadas",
    },
    {
      label: "Canais que atuo",
      value: channelCount,
      hint: channelCount === 1 ? "distribuidor" : "distribuidores",
      icon: Store,
      tone: "default" as const,
      href: "/meus-canais",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {cards.map((metric) => (
        <Card
          key={metric.label}
          className="gap-2 p-0 transition-colors hover:bg-muted/40"
        >
          <Link href={metric.href} className="block p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <metric.icon
                className={
                  metric.tone === "alert"
                    ? "size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    : "size-4 shrink-0 text-muted-foreground"
                }
              />
            </div>
            <p
              className={
                metric.tone === "alert"
                  ? "mt-3 text-3xl font-semibold tracking-tight tabular-nums text-amber-600 dark:text-amber-400"
                  : "mt-3 text-3xl font-semibold tracking-tight tabular-nums"
              }
            >
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
          </Link>
        </Card>
      ))}
    </div>
  );
}

/** Meus canais compactos: até 4 canais mais críticos. */
function ChannelsSummaryCard({ channels }: { channels: ChannelCard[] }) {
  // Critérios: atrasadas primeiro (desc), depois pendentes (desc), depois nome.
  const sorted = [...channels].sort((a, b) => {
    if (a.lateCount !== b.lateCount) return b.lateCount - a.lateCount;
    if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount;
    return a.name.localeCompare(b.name);
  });
  const items = sorted.slice(0, 4);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="size-4 text-muted-foreground" />
          Meus canais
        </CardTitle>
        <CardDescription>Toque para ver detalhes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {channels.length === 0 ? (
          <Empty className="my-2 rounded-2xl border border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Store />
              </EmptyMedia>
              <EmptyTitle>Sem canais vinculados</EmptyTitle>
              <EmptyDescription>
                Você não está vinculado a nenhum canal — fale com o time de CX.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {items.map((channel, index) => (
              <div key={channel.id}>
                {index > 0 ? <ItemSeparator /> : null}
                <Item
                  size="sm"
                  render={<Link href={`/meus-canais/${channel.id}`} />}
                  className="hover:bg-muted/60"
                >
                  <ItemContent className="min-w-0 gap-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        aria-label={HEALTH_CONFIG[channel.health].label}
                        title={HEALTH_CONFIG[channel.health].label}
                        className={`size-2 shrink-0 rounded-full ${HEALTH_CONFIG[channel.health].dotClass}`}
                      />
                      <span className="min-w-0 truncate font-medium">
                        {channel.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      <span>
                        {channel.completedCount}/{channel.activityCount} feitas
                      </span>
                      {channel.pendingCount > 0 ? (
                        <span>· {channel.pendingCount} pendentes</span>
                      ) : null}
                      {channel.lateCount > 0 ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          · {channel.lateCount}{" "}
                          {channel.lateCount === 1
                            ? "atrasada"
                            : "atrasadas"}
                        </span>
                      ) : null}
                    </div>
                    <Progress
                      value={channel.completedPercent}
                      className="h-1"
                    />
                  </ItemContent>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Item>
              </div>
            ))}
          </ItemGroup>
        )}
        {channels.length > 4 ? (
          <div className="mt-auto pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              nativeButton={false}
              render={<Link href="/meus-canais" />}
            >
              Ver todos os canais
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Registros recentes (últimos 7 dias): até 3 cards com thumbnail. */
function RecentExecutionsCard({
  executions,
}: {
  executions: RecentExecution[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="size-4 text-muted-foreground" />
          Registros recentes
        </CardTitle>
        <CardDescription>
          O que você concluiu nos últimos dias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {executions.map((execution) => {
            const photoUrl = photoPublicUrl(execution.photoPath);
            const meta = [execution.channelName, execution.branchName]
              .filter(Boolean)
              .join(" · ");
            return (
              <Link
                key={execution.id}
                href={`/atividades/${execution.activityId}`}
                className="group flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-muted/40"
              >
                <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={execution.activityTitle}
                      fill
                      sizes="(min-width: 768px) 22vw, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Camera className="size-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="line-clamp-1 font-medium">
                    {execution.activityTitle}
                  </p>
                  {meta ? (
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {meta}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(execution.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Home do RTV — o painel de partida do dia. Responde "o que preciso fazer
 * agora?": métricas do escopo, CTA de registrar, próximas urgentes,
 * canais críticos e registros recentes. Não é dashboard analítico.
 */
async function FieldHome() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const [{ activities }, recentExecutions, channels] = await Promise.all([
    getFieldActivities(profile),
    getMyRecentExecutions(profile.id, 3),
    getChannelCards(channelIds),
  ]);

  const firstName = profile.fullName.split(" ")[0];

  // Só o que é meu (assignee), no escopo desta safra.
  const mine = activities.filter((activity) => activity.isMine);
  const open = mine.filter((activity) =>
    OPEN_STATUSES.includes(activity.status)
  );
  const late = mine.filter((activity) => activity.status === "atrasada");
  const completed = mine.filter((activity) => activity.status === "concluida");
  const dueThisWeekCount = open.filter(
    (activity) =>
      activity.status !== "atrasada" &&
      activity.dueDate !== null &&
      differenceInCalendarDays(parseISO(activity.dueDate), new Date()) <= 7
  ).length;

  const contextLine = greetingContextLine({
    lateCount: late.length,
    dueThisWeekCount,
    openCount: open.length,
    completedCount: completed.length,
    totalCount: mine.length,
  });
  const contextClass =
    late.length > 0
      ? "text-sm font-medium text-amber-600 dark:text-amber-400"
      : "text-sm text-muted-foreground";

  // Ordem: atrasadas (por dias de atraso desc = prazo mais antigo primeiro)
  // > vencendo em 7 dias > outras abertas > planejadas por prazo asc. Sem
  // prazo por último. Preenche a tabela até 8 linhas mesmo sem urgência —
  // "abertas" inclui planejada + em_andamento + atrasada.
  const tomorrow = new Date();
  const openOrdered = [...open].sort((a, b) => {
    const rank = (activity: (typeof open)[number]) => {
      if (activity.status === "atrasada") return 0;
      if (
        activity.dueDate !== null &&
        differenceInCalendarDays(parseISO(activity.dueDate), tomorrow) <= 7
      )
        return 1;
      return 2;
    };
    const rA = rank(a);
    const rB = rank(b);
    if (rA !== rB) return rA - rB;
    if (a.dueDate === b.dueDate) return a.title.localeCompare(b.title);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });

  // Últimos 7 dias — o bloco 4 só aparece se houver algo relevante.
  const now = new Date();
  const recentInWindow = recentExecutions.filter(
    (execution) => differenceInDays(now, parseISO(execution.createdAt)) <= 7
  );

  // Até 8 abertas para a tabela da home.
  const tableRows = openOrdered.slice(0, 8).map((activity) => ({
    id: activity.id,
    title: activity.title,
    status: activity.status,
    category: activity.category,
    dueDate: activity.dueDate,
    completedAt: activity.completedAt,
    branchName: activity.branchName,
    channelName: activity.channelName,
  }));

  return (
    <PageShell
      title={`${greetingByHour(currentHourInSaoPaulo())}, ${firstName}`}
      description={`${contextLine}.`}
      descriptionClassName={contextClass}
      actions={
        <Button
          size="lg"
          className="h-14 gap-2 px-6 text-base font-semibold shadow-sm"
          nativeButton={false}
          render={
            <Link href="/registrar">
              <Camera className="size-5" />
              Registrar nova atividade
            </Link>
          }
        />
      }
    >
      <RtvMetrics
        openCount={open.length}
        completedCount={completed.length}
        totalCount={mine.length}
        lateCount={late.length}
        channelCount={channels.length}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              Minhas atividades
            </CardTitle>
            {tableRows.length > 0 ? (
              <CardDescription>
                {tableRows.length === 1
                  ? "A próxima atividade aberta."
                  : `As ${tableRows.length} próximas atividades abertas — atrasadas primeiro.`}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <RtvActivitiesTable
              activities={tableRows}
              totalOpen={openOrdered.length}
              profileId={profile.id}
              profileName={profile.fullName}
            />
          </CardContent>
        </Card>
        <ChannelsSummaryCard channels={channels} />
      </div>
      {recentInWindow.length > 0 ? (
        <RecentExecutionsCard executions={recentInWindow} />
      ) : null}
    </PageShell>
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
