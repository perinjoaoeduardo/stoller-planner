import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  Clock,
  ListTodo,
  Store,
  Target,
  TriangleAlert,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  differenceInCalendarDays,
  differenceInDays,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { ActivityLink } from "@/components/app/activity-link";
import { DsmMyActivities } from "@/components/app/dsm-my-activities";
import { NewActivityButton } from "@/components/app/new-activity-button";
import { PageShell } from "@/components/app/page-shell";
import {
  type ActivityTableRow,
} from "@/components/shared/activity-table";
import { CanalCard } from "@/components/shared/canal-card";
import { HealthMark } from "@/components/shared/health-mark";
import { IconBox } from "@/components/shared/icon-box";
import { StatCard } from "@/components/shared/stat-card";
import { RtvActivitiesTable } from "@/components/app/rtv-activities-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getChannelCards, type ChannelCard } from "@/lib/db/channels";
import {
  getDsmHome,
  type DsmException,
  type DsmExceptionKind,
  type DsmHome,
  type DsmHomeChannel,
  type DsmMyActivity,
} from "@/lib/db/dsm-home";
import {
  getFieldActivities,
  getMyRecentExecutions,
  OPEN_STATUSES,
  type RecentExecution,
} from "@/lib/db/execution";
import { Progress } from "@/components/ui/progress";
import { greetingByHour, greetingContextLine } from "@/lib/rtv/greeting";

export const dynamic = "force-dynamic";

// ── Home do DSM (painel de gestão) ─────────────────────────────────────

const EXCEPTION_ICONS: Record<DsmExceptionKind, LucideIcon> = {
  canal_escuro: AlertCircle,
  rtv_atrasadas: User,
  meta_sem_atividade: Target,
  atraso_critico: Clock,
};

const MAX_MY_ACTIVITIES = 5;
/** Altura visível dos cards pareados (Meus canais / Precisa de atenção)
 *  — ~6 linhas; o excedente entra no scroll interno. */
const PAIRED_CARD = "flex h-full max-h-[26rem] flex-col gap-0 overflow-hidden py-0";
/** Header canônico dos cards pareados: título + contagem + descrição +
 *  ação, colado no corpo por um border-b. */
const PAIRED_HEADER =
  "shrink-0 border-b border-border px-4 py-4 sm:px-5 [.border-b]:pb-4";

/** Contagem discreta ao lado do título dos cards pareados. */
function TitleCount({ value }: { value: number }) {
  return (
    <span className="text-sm font-normal tabular-nums text-muted-foreground">
      {value}
    </span>
  );
}

/** FIX 1 — stat cards de gestão (não de execução). */
function DsmStats({ stats }: { stats: DsmHome["stats"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Canais que acompanho"
        value={stats.channelCount}
        sublabel="na safra"
        icon={Store}
        href="/canais"
      />
      <StatCard
        title="Canais em risco"
        value={stats.atRiskCount}
        sublabel="exigem acompanhamento"
        icon={TriangleAlert}
        tone={stats.atRiskCount > 0 ? "warning" : "neutral"}
        href="/canais"
      />
      <StatCard
        title="RTVs na equipe"
        value={stats.rtvCount}
        sublabel="ver equipe"
        icon={Users}
        href="/equipe"
      />
      <StatCard
        title="Minhas pendências"
        value={stats.myOpenCount}
        sublabel="atribuídas a você"
        icon={ClipboardCheck}
        tone={stats.myHasOverdue ? "warning" : "neutral"}
        href="/pendencias"
      />
    </div>
  );
}

function DsmSectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

const ROW_PROGRESS_CLASS =
  "flex-1 [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-primary [&_[data-slot=progress-track]]:h-1";

/** FIX 2 — Meus canais: linhas divididas (sem card-em-card), pior
 *  primeiro, com scroll interno (coluna esquerda do par). */
function MeusCanaisCard({ channels }: { channels: DsmHomeChannel[] }) {
  return (
    <Card className={PAIRED_CARD}>
      <CardHeader className={PAIRED_HEADER}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="size-4 text-muted-foreground" />
          Meus canais
          <TitleCount value={channels.length} />
        </CardTitle>
        <CardDescription>Saúde do plano em cada canal.</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            nativeButton={false}
            render={<Link href="/canais" />}
          >
            Ver todos
            <ChevronRight className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {channels.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum canal sob sua gestão nesta safra.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60 px-2 py-1">
            {channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/canais/${channel.id}`}
                className="group flex flex-col gap-2 rounded-lg px-3 py-3.5 transition-colors hover:bg-hover-surface"
              >
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {channel.name}
                  </p>
                  <HealthMark
                    health={channel.health}
                    className="shrink-0"
                  />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-slow ease-emphasized group-hover:translate-x-0.5" />
                </div>
                <div className="flex items-center gap-2.5">
                  <Progress
                    value={channel.completedPercent}
                    className={ROW_PROGRESS_CLASS}
                  />
                  <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                    {channel.completedPercent}%
                  </span>
                  {channel.lateCount > 0 ? (
                    <span className="shrink-0 text-xs tabular-nums text-warning">
                      · {channel.lateCount}{" "}
                      {channel.lateCount === 1 ? "atrasada" : "atrasadas"}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Tom do IconBox por tipo de exceção — âmbar é atraso/silêncio (a
 *  regra de alarme único), lacuna de planejamento fica neutra. */
const EXCEPTION_TONE: Record<
  DsmExceptionKind,
  { box: string; icon: string }
> = {
  canal_escuro: { box: "bg-warning-bg", icon: "text-warning-fg" },
  rtv_atrasadas: { box: "bg-warning-bg", icon: "text-warning-fg" },
  atraso_critico: { box: "bg-warning-bg", icon: "text-warning-fg" },
  meta_sem_atividade: { box: "bg-muted", icon: "text-foreground/70" },
};

/** FIX 3 — "Precisa de atenção": todas as exceções, scroll interno
 *  (coluna direita do par). */
function ExceptionQueue({ exceptions }: { exceptions: DsmException[] }) {
  return (
    <Card className={PAIRED_CARD}>
      <CardHeader className={PAIRED_HEADER}>
        <CardTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="size-4 text-muted-foreground" />
          Precisa de atenção
          {exceptions.length > 0 ? (
            <TitleCount value={exceptions.length} />
          ) : null}
        </CardTitle>
        <CardDescription>
          O que está travando a safra nos seus canais.
        </CardDescription>
      </CardHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {exceptions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <CircleCheckBig className="size-8 text-success" />
            <p className="text-sm font-medium text-foreground">
              Tudo em dia por aqui.
            </p>
            <p className="text-xs text-muted-foreground">
              Nenhuma exceção aberta nos seus canais.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/60 px-2 py-1">
            {exceptions.map((exception) => {
              const Icon = EXCEPTION_ICONS[exception.kind];
              const tone = EXCEPTION_TONE[exception.kind];
              const rowClass =
                "group flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-hover-surface";
              const body = (
                <>
                  <IconBox
                    icon={Icon}
                    size="sm"
                    className={tone.box}
                    iconClassName={tone.icon}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {exception.title}
                    </p>
                    {exception.context ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {exception.context}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-slow ease-emphasized group-hover:translate-x-0.5" />
                </>
              );
              // Exceção de atividade abre o painel; canal/meta navegam.
              return exception.activityId ? (
                <ActivityLink
                  key={exception.key}
                  activityId={exception.activityId}
                  className={rowClass}
                >
                  {body}
                </ActivityLink>
              ) : (
                <Link
                  key={exception.key}
                  href={exception.href}
                  className={rowClass}
                >
                  {body}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/** FIX 4 — minhas atividades (o DSM executor). */
function MyActivitiesSection({
  activities,
  viewAllHref,
}: {
  activities: DsmMyActivity[];
  viewAllHref: string;
}) {
  const rows: ActivityTableRow[] = activities
    .slice(0, MAX_MY_ACTIVITIES)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      category: activity.category,
      status: activity.status,
      dueDate: activity.dueDate,
      branchName: activity.branchName,
      channelName: activity.channelName,
    }));

  return (
    <section className="flex flex-col gap-3">
      <DsmSectionHeader
        title="Minhas atividades"
        subtitle="Suas reuniões e ações na safra."
        action={
          activities.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              nativeButton={false}
              render={<Link href={viewAllHref} />}
            >
              Ver todas
              <ChevronRight className="size-4" />
            </Button>
          ) : null
        }
      />
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma atividade sua em aberto.
          </CardContent>
        </Card>
      ) : (
        <DsmMyActivities activities={rows} />
      )}
    </section>
  );
}

/** FIX 5 — panorama da safra (contexto de fundo, rodapé). */
function PanoramaSection({ byStatus }: { byStatus: DsmHome["byStatus"] }) {
  const total = byStatus.reduce((sum, row) => sum + row.total, 0);
  const completed =
    byStatus.find((row) => row.status === "concluida")?.total ?? 0;
  const late = byStatus.find((row) => row.status === "atrasada")?.total ?? 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Panorama da safra</CardTitle>
          <CardDescription>
            Distribuição das atividades dos seus canais.
          </CardDescription>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{percent}%</span>{" "}
          concluídas ·{" "}
          <span className="font-medium text-foreground">{late}</span>{" "}
          {late === 1 ? "atrasada" : "atrasadas"}
        </p>
      </CardHeader>
      <CardContent>
        <ActivitiesStatusChart data={byStatus} />
      </CardContent>
    </Card>
  );
}

/** Home do DSM — painel de gestão híbrido (gestão protagonista, execução
 *  própria reconhecida mas secundária). */
async function DsmHome() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const home = await getDsmHome(profile, channelIds);

  return (
    <PageShell
      title="Início"
      description="Panorama dos seus canais na safra 2025/26."
      actions={<NewActivityButton />}
    >
      <DsmStats stats={home.stats} />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <MeusCanaisCard channels={home.channels} />
        <ExceptionQueue exceptions={home.exceptions} />
      </div>

      <MyActivitiesSection
        activities={home.myActivities}
        viewAllHref={`/atividades?responsavel=${profile.id}`}
      />

      <PanoramaSection byStatus={home.byStatus} />
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((metric) => (
        <StatCard
          key={metric.label}
          title={metric.label}
          value={metric.value}
          sublabel={metric.hint}
          icon={metric.icon}
          tone={metric.tone === "alert" ? "warning" : "neutral"}
          href={metric.href}
        />
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
          <div className="space-y-3">
            {items.map((channel) => (
              <CanalCard
                key={channel.id}
                canal={channel}
                variant="compact"
                href={`/meus-canais/${channel.id}`}
              />
            ))}
          </div>
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
              <ActivityLink
                key={execution.id}
                activityId={execution.activityId}
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
              </ActivityLink>
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
  const contextClass = "text-sm text-muted-foreground";

  // Ordem: atrasadas (por dias de atraso desc = prazo mais antigo primeiro)
  // > vencendo em 7 dias > outras abertas > planejadas por prazo asc. Sem
  // prazo por último. "abertas" = planejada ou atrasada — encerradas
  // (concluída E cancelada) ficam fora da home; canceladas vivem no fim
  // da fila em /minhas-atividades.
  const openForTable = mine.filter(
    (activity) =>
      activity.status !== "concluida" && activity.status !== "nao_feita"
  );
  const tomorrow = new Date();
  const openOrdered = [...openForTable].sort((a, b) => {
    const rank = (activity: (typeof openForTable)[number]) => {
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

  // Todas as abertas para a tabela da home.
  const tableRows = openOrdered.map((activity) => ({
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
        <NewActivityButton
          size="lg"
          />
      }
    >
      <RtvMetrics
        openCount={openForTable.length}
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
                Todas as atividades abertas, atrasadas primeiro.
              </CardDescription>
            ) : null}
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-muted-foreground"
                nativeButton={false}
                render={<Link href="/minhas-atividades" />}
              >
                Ver todos
                <ChevronRight className="size-4" />
              </Button>
            </CardAction>
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
