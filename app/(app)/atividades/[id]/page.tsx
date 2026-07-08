import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ImageMinus,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  SearchX,
  type LucideIcon,
} from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { CategoryBadge } from "@/components/app/category-badge";
import { StatusBadge, STATUS_LABELS } from "@/components/app/status-badge";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  canEditPlan,
  canRegisterExecution,
  getCurrentProfile,
  getScopedChannelIds,
} from "@/lib/auth/scope";
import {
  getActivityDetail,
  getPlanProblems,
  type ActivityDetail,
} from "@/lib/db/channels";
import { isLateActivity } from "@/lib/db/status";

import { PhotosCard } from "./photos-card";
import { ProblemEditor } from "./problem-editor";
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

const EVENT_LABELS: Record<string, string> = {
  criada: "Atividade criada",
  editada: "Atividade editada",
  status_alterado: "Status alterado",
  foto_adicionada: "Foto adicionada",
  foto_removida: "Foto removida",
  execucao_registrada: "Execução registrada",
  reaberta: "Atividade reaberta",
};

/** Ícone semântico por evento; conclusão ganha o check verde da vida. */
function eventIcon(type: string, description: string | null): LucideIcon {
  if (type === "status_alterado" && description?.includes('para "Concluída"')) {
    return CheckCircle2;
  }
  if (type === "execucao_registrada" && description) {
    return MessageSquare;
  }
  const icons: Record<string, LucideIcon> = {
    criada: Plus,
    editada: Pencil,
    status_alterado: RefreshCw,
    foto_adicionada: Camera,
    foto_removida: ImageMinus,
    execucao_registrada: ClipboardCheck,
    reaberta: RotateCcw,
    problema_vinculado: Link2,
  };
  return icons[type] ?? RefreshCw;
}

/** "Em andamento desde 06 jul" / "Concluída em 15 mar". */
function statusContextLabel(activity: ActivityDetail): string | null {
  if (activity.status === "concluida") {
    return activity.completedAt
      ? `Concluída em ${formatDate(activity.completedAt)}`
      : null;
  }
  if (activity.status === "atrasada" && activity.dueDate) {
    return `Atrasada desde ${formatDate(activity.dueDate)}`;
  }
  const statusEvent = activity.events.find(
    (event) => event.type === "status_alterado" || event.type === "reaberta"
  );
  const since = statusEvent?.createdAt ?? activity.createdAt;
  return `${STATUS_LABELS[activity.status]} desde ${formatDate(since)}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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
                render={<Link href="/minhas-atividades" />}
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

  const [canEdit, canRegister, planProblems] = await Promise.all([
    canEditPlan(profile, activity.channelId),
    canRegisterExecution(profile, {
      id: activity.id,
      responsible_id: activity.responsibleId,
      branch_id: activity.branchId,
      channel_id: activity.channelId,
    }),
    getPlanProblems(activity.planId),
  ]);

  // RTV navega pelos "Meus Canais"; DSM/CX pelo cockpit denso.
  const isField = profile.role === "RTV";
  const channelBase = isField ? "/meus-canais" : "/canais";
  const channelHref = `${channelBase}/${activity.channelId}`;

  const overdue =
    isLateActivity(activity) && activity.status !== "concluida";

  // Pendência do "vincular depois": concluída, sem problema, num plano
  // que tem problemas cadastrados.
  const needsProblemLink =
    activity.status === "concluida" &&
    activity.problemId === null &&
    planProblems.length > 0;

  const timeline = [...activity.events];
  const hasCreationEvent = timeline.some((event) => event.type === "criada");

  const aboutRows: { label: string; value: ReactNode }[] = [
    {
      label: "Local",
      value: activity.branchName ? (
        `${activity.branchName}${activity.branchCity ? ` — ${activity.branchCity}` : ""}`
      ) : (
        <span className="text-muted-foreground">Canal geral</span>
      ),
    },
    {
      label: "Tipo de ação",
      value: activity.category ? (
        <CategoryBadge category={activity.category} />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      label: "Problema vinculado",
      value: (
        <ProblemEditor
          activityId={activity.id}
          problemId={activity.problemId}
          problemTitle={activity.problemTitle}
          problems={planProblems}
          canEdit={canEdit || canRegister}
          showPendency={needsProblemLink}
          channelHref={channelHref}
        />
      ),
    },
    {
      label: "Responsáveis",
      value:
        activity.assignees.length > 0 ? (
          <span className="flex items-center gap-2">
            <AvatarGroup>
              {activity.assignees.slice(0, 4).map((assignee) => (
                <Avatar key={assignee.id} size="sm">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(assignee.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            <span className="leading-snug">
              {activity.assignees.map((assignee) => assignee.name).join(", ")}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Sem responsável</span>
        ),
    },
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
          {activity.dueDate ? (
            formatDate(activity.dueDate)
          ) : (
            <span className="text-muted-foreground">Sem prazo</span>
          )}
        </span>
      ),
    },
    {
      label: "Criada em",
      value: (
        <span className="tabular-nums">
          {formatDate(activity.createdAt, true)}
        </span>
      ),
    },
  ];

  if (activity.completedAt) {
    aboutRows.push({
      label: "Concluída em",
      value: (
        <span className="tabular-nums">
          {formatDate(activity.completedAt, true)}
        </span>
      ),
    });
  }

  // Última descrição de execução registrada (o RTV é quem contou o que
  // aconteceu quando concluiu); vira o card "Descrição da execução".
  const executionEvent = activity.events.find(
    (event) =>
      event.type === "execucao_registrada" &&
      event.description &&
      event.description.trim().length > 0
  );

  const isOpen =
    activity.status === "planejada" ||
    activity.status === "em_andamento" ||
    activity.status === "atrasada";

  return (
    <PageShell
      title={activity.title}
      backHref={isField ? "/minhas-atividades" : channelHref}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={channelBase} />}>
                {isField ? "Meus Canais" : "Canais"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={channelHref} />}>
                {activity.channelName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Atividade</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      description={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={activity.status}
            className="px-3 py-1 text-sm"
          />
          {activity.category ? (
            <CategoryBadge
              category={activity.category}
              className="px-3 py-1 text-sm"
            />
          ) : null}
        </span>
      }
      descriptionClassName="mt-1 flex"
      actions={
        isOpen && canRegister ? (
          <Button
            nativeButton={false}
            render={<Link href={`/registrar?atividade=${activity.id}`} />}
          >
            <Camera className="size-4" />
            Registrar
          </Button>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sobre</CardTitle>
              <CardDescription>
                Contexto da atividade dentro do plano da safra.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {activity.description ? (
                <p className="text-base leading-relaxed">
                  {activity.description}
                </p>
              ) : null}
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {aboutRows.map((row) => (
                  <div key={row.label} className="min-w-0 space-y-1">
                    <dt className="text-xs text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="min-w-0">{row.value}</dd>
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

          {executionEvent ? (
            <Card>
              <CardHeader>
                <CardTitle>Descrição da execução</CardTitle>
                <CardDescription>
                  O que foi registrado sobre esta execução.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {executionEvent.description}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Registrada{" "}
                  {formatDistanceToNow(parseISO(executionEvent.createdAt), {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <StatusCard
            activityId={activity.id}
            status={activity.status}
            contextLabel={statusContextLabel(activity)}
            canChange={canRegister || canEdit}
          />

          <Card>
            <CardHeader>
              <CardTitle>Linha do tempo</CardTitle>
              <CardDescription>
                Tudo que aconteceu nesta atividade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
                {timeline.map((event) => {
                  const Icon = eventIcon(event.type, event.description);
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
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <p className="w-fit text-xs text-muted-foreground" />
                            }
                          >
                            {formatDistanceToNow(parseISO(event.createdAt), {
                              locale: ptBR,
                              addSuffix: true,
                            })}
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatDate(event.createdAt, true)}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </li>
                  );
                })}
                {!hasCreationEvent ? (
                  <li className="relative flex gap-3">
                    <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Plus className="size-3 text-muted-foreground" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Atividade criada</p>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <p className="w-fit text-xs text-muted-foreground" />
                          }
                        >
                          {formatDistanceToNow(parseISO(activity.createdAt), {
                            locale: ptBR,
                            addSuffix: true,
                          })}
                        </TooltipTrigger>
                        <TooltipContent>
                          {formatDate(activity.createdAt, true)}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ) : null}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Botão Registrar sticky no rodapé apenas no mobile e se atividade aberta */}
      {isOpen && canRegister ? (
        <div className="sticky bottom-0 -mx-5 mt-2 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:-mx-8 lg:hidden">
          <Button
            size="lg"
            className="h-12 w-full text-base"
            nativeButton={false}
            render={<Link href={`/registrar?atividade=${activity.id}`} />}
          >
            <Camera className="size-5" />
            Registrar
          </Button>
        </div>
      ) : null}
    </PageShell>
  );
}
