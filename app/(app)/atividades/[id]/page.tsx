import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck,
  CalendarClock,
  CirclePlus,
  ClipboardCheck,
  ImageMinus,
  ImagePlus,
  Pencil,
  RefreshCw,
  RotateCcw,
  SearchX,
  type LucideIcon,
} from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  canEditPlan,
  canRegisterExecution,
  getCurrentProfile,
  getScopedChannelIds,
} from "@/lib/auth/scope";
import { getActivityDetail } from "@/lib/db/channels";
import { isLateActivity } from "@/lib/db/status";

import { PhotosCard } from "./photos-card";
import { StatusCard } from "./status-card";

export const dynamic = "force-dynamic";

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  return format(
    parseISO(value),
    withTime ? "dd MMM yyyy 'às' HH:mm" : "dd MMM yyyy",
    { locale: ptBR }
  );
}

const EVENT_ICONS: Record<string, LucideIcon> = {
  criada: CirclePlus,
  editada: Pencil,
  status_alterado: RefreshCw,
  foto_adicionada: ImagePlus,
  foto_removida: ImageMinus,
  execucao_registrada: ClipboardCheck,
  reaberta: RotateCcw,
};

const EVENT_LABELS: Record<string, string> = {
  criada: "Atividade criada",
  editada: "Atividade editada",
  status_alterado: "Status alterado",
  foto_adicionada: "Foto adicionada",
  foto_removida: "Foto removida",
  execucao_registrada: "Execução registrada",
  reaberta: "Atividade reaberta",
};

function ActivityNotFound() {
  return (
    <PageShell title="Atividade" description="Detalhe da atividade do plano.">
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>Atividade não encontrada ou sem acesso</EmptyTitle>
              <EmptyDescription>
                Esta atividade não existe ou pertence a um canal fora da sua
                carteira.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/atividades" />}
              >
                Voltar para atividades
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export const metadata: Metadata = {
  title: "Atividade — Corteva Planner",
};

export default async function AtividadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const activity = await getActivityDetail(id);
  if (!activity) return <ActivityNotFound />;

  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(activity.channelId)) return <ActivityNotFound />;

  const [canEdit, canRegister] = await Promise.all([
    canEditPlan(profile, activity.channelId),
    canRegisterExecution(profile, {
      responsible_id: activity.responsibleId,
      branch_id: activity.branchId,
      channel_id: activity.channelId,
    }),
  ]);

  const overdue =
    isLateActivity(activity) && activity.status !== "concluida";

  const timeline = [...activity.events];
  const hasCreationEvent = timeline.some((event) => event.type === "criada");

  const aboutRows = [
    {
      label: "Problema vinculado",
      value: activity.problemTitle ? (
        <Link
          href={`/canais/${activity.channelId}?tab=problemas`}
          className="underline-offset-4 hover:underline"
        >
          <Badge variant="outline" className="max-w-full">
            <span className="truncate">{activity.problemTitle}</span>
          </Badge>
        </Link>
      ) : (
        <Badge variant="outline" className="border-dashed text-muted-foreground">
          Sem vínculo
        </Badge>
      ),
    },
    {
      label: "Filial",
      value: activity.branchName
        ? `${activity.branchName}${activity.branchCity ? ` — ${activity.branchCity}` : ""}`
        : "—",
    },
    { label: "Responsável", value: activity.responsibleName ?? "—" },
    {
      label: "Prazo",
      value: (
        <span
          className={
            overdue
              ? "font-medium text-red-600 tabular-nums dark:text-red-400"
              : "tabular-nums"
          }
        >
          {formatDate(activity.dueDate)}
        </span>
      ),
    },
    {
      label: "Criada em",
      value: <span className="tabular-nums">{formatDate(activity.createdAt, true)}</span>,
    },
    {
      label: "Concluída em",
      value: (
        <span className="tabular-nums">
          {formatDate(activity.completedAt, true)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <header className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/canais" />}>
                Canais
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link href={`/canais/${activity.channelId}`} />}
              >
                {activity.channelName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Atividade</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {activity.title}
          </h1>
          <StatusBadge
            status={activity.status}
            className="px-3 py-1 text-sm"
          />
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sobre</CardTitle>
              <CardDescription>
                Contexto da atividade dentro do plano da safra.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {activity.description ? (
                <p className="text-sm leading-relaxed">
                  {activity.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem descrição registrada.
                </p>
              )}
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {aboutRows.map((row) => (
                  <div key={row.label} className="space-y-0.5">
                    <dt className="text-xs text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <PhotosCard
            activityId={activity.id}
            photos={activity.photos}
            canManage={canRegister}
          />
        </div>

        <div className="flex flex-col gap-4">
          <StatusCard
            activityId={activity.id}
            status={activity.status}
            canChange={canRegister || canEdit}
          />

          <Card>
            <CardHeader>
              <CardTitle>Linha do tempo</CardTitle>
              <CardDescription>
                Eventos registrados na vida da atividade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
                {timeline.map((event) => {
                  const Icon = EVENT_ICONS[event.type] ?? RefreshCw;
                  return (
                    <li key={event.id} className="relative flex gap-3 pl-0">
                      <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                        <Icon className="size-3 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium">
                          {EVENT_LABELS[event.type] ?? event.type}
                        </p>
                        {event.description ? (
                          <p className="text-xs text-muted-foreground">
                            {event.description}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(event.createdAt, true)}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {!hasCreationEvent ? (
                  <li className="relative flex gap-3">
                    <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                      <CirclePlus className="size-3 text-muted-foreground" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Atividade criada</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(activity.createdAt, true)}
                      </p>
                    </div>
                  </li>
                ) : null}
              </ol>
              {activity.completedAt ? (
                <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarCheck className="size-3.5" />
                  Concluída em{" "}
                  <span className="tabular-nums">
                    {formatDate(activity.completedAt, true)}
                  </span>
                </p>
              ) : activity.dueDate ? (
                <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  Prazo:{" "}
                  <span className="tabular-nums">
                    {formatDate(activity.dueDate)}
                  </span>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
