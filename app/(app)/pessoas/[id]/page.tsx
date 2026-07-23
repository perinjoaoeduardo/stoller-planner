import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Store,
} from "lucide-react";

import { ActivityLink } from "@/components/app/activity-link";
import { PageShell } from "@/components/app/page-shell";
import { ClickableCard } from "@/components/shared/clickable-card";
import { StatCard } from "@/components/shared/stat-card";
import type { ActivityRowData } from "@/components/shared/activity-row";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { daysSince, isDark } from "@/lib/db/cx";
import { getPersonDetail } from "@/lib/db/person";

import { PersonActivities } from "./person-activities";
import { getInitials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Perfil — Corteva Planner",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  DSM: "Gestor de canais",
  RTV: "Consultor técnico de vendas",
  RDC: "Representante de desenvolvimento",
  CX: "Excelência comercial",
};

/** Aberta primeiro (atrasada > planejada por prazo), encerrada por último. */
function sortForProfile(activities: ActivityRowData[]): ActivityRowData[] {
  const rank = (a: ActivityRowData) =>
    a.status === "atrasada" ? 0 : a.status === "planejada" ? 1 : 2;
  return [...activities].sort((a, b) => {
    const rA = rank(a);
    const rB = rank(b);
    if (rA !== rB) return rA - rB;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });
}

/**
 * Perfil de pessoa — aberto a partir da aba Pessoas do /acompanhamento
 * (CX) e de qualquer lugar que aponte para /pessoas/[id]. Responde
 * "como está o trabalho desta pessoa?": ritmo de registro, carga de
 * atividades, atrasos e onde ela atua.
 *
 * Escopo: CX vê qualquer pessoa; DSM só quem atua nos canais dele;
 * RTV/RDC só o próprio perfil.
 */
export default async function PessoaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentProfile();

  const person = await getPersonDetail(id);
  if (!person) notFound();

  // Guard de escopo por perfil de quem olha.
  if (viewer.role === "DSM") {
    const scoped = await getScopedChannelIds(viewer);
    const shares =
      viewer.id === person.id ||
      person.links.some((link) => scoped.includes(link.channelId));
    if (!shares) notFound();
  } else if (viewer.role !== "CX" && viewer.id !== person.id) {
    notFound();
  }

  const days = daysSince(person.lastExecutionAt);
  const dark = isDark(person.lastExecutionAt);
  const lastRegisterValue =
    days === null ? "Nunca" : days === 0 ? "Hoje" : `há ${days} d`;

  const rows: ActivityRowData[] = person.activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    status: activity.status,
    category: activity.category,
    dueDate: activity.dueDate,
    channelName: activity.channelName,
    branchName: activity.branchName,
    problemTitle: activity.problemTitle,
    assignees: activity.assignees,
  }));
  const sortedRows = sortForProfile(rows).slice(0, 12);

  const firstName = person.name.split(" ")[0];
  const roleDescription = ROLE_DESCRIPTIONS[person.role] ?? person.role;

  return (
    <PageShell
      backHref="/acompanhamento?tab=pessoas"
      title={person.name}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{person.role}</Badge>
          <span>{roleDescription}</span>
          {person.regionNames.length > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{person.regionNames.join(", ")}</span>
            </>
          ) : null}
        </span>
      }
      actions={
        <Avatar className="size-12 border border-border">
          {person.avatarUrl ? (
            <AvatarImage src={person.avatarUrl} alt={person.name} />
          ) : null}
          <AvatarFallback className="text-sm font-medium">
            {getInitials(person.name)}
          </AvatarFallback>
        </Avatar>
      }
    >
      {/* Ritmo e carga */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Atividades na safra"
          value={person.stats.total}
          sublabel="no nome dela"
          icon={ClipboardList}
        />
        <StatCard
          title="Concluídas"
          value={`${person.stats.completedPercent}%`}
          sublabel={`${person.stats.completed} de ${person.stats.total}`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Atrasadas"
          value={person.stats.late}
          sublabel="vencidas ainda abertas"
          icon={AlertCircle}
          tone={person.stats.late > 0 ? "warning" : "neutral"}
        />
        <StatCard
          title="Último registro"
          value={lastRegisterValue}
          sublabel={dark ? "sem registro recente" : "ritmo em dia"}
          icon={Camera}
          tone={dark ? "warning" : "neutral"}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Onde atua */}
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="size-4 text-muted-foreground" />
              Onde atua
            </CardTitle>
            <CardDescription>
              {person.links.length === 0
                ? "Sem vínculos ativos."
                : person.role === "DSM"
                  ? "Canais sob gestão."
                  : "Canais e filiais vinculados."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {person.links.map((link) => (
              <ClickableCard
                key={link.channelId}
                href={`/canais/${link.channelId}`}
                showArrow
                className="flex flex-col gap-0.5 p-3.5"
              >
                <p className="truncate pr-8 text-sm font-semibold text-foreground">
                  {link.channelName}
                </p>
                <p className="truncate pr-8 text-xs text-muted-foreground">
                  {link.regionName}
                  {link.branchNames.length > 0
                    ? ` · ${link.branchNames.join(", ")}`
                    : ""}
                </p>
              </ClickableCard>
            ))}
          </CardContent>
        </Card>

        {/* Registros recentes */}
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="size-4 text-muted-foreground" />
              Registros recentes
            </CardTitle>
            <CardDescription>
              As últimas execuções registradas por {firstName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {person.recentExecutions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma execução registrada até agora.
              </p>
            ) : (
              person.recentExecutions.map((execution) => (
                <ActivityLink
                  key={execution.id}
                  activityId={execution.activityId}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-hover-surface"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {execution.activityTitle}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[execution.channelName, execution.branchName]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatDistanceToNow(parseISO(execution.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </ActivityLink>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <PersonActivities
        activities={sortedRows}
        viewAllHref={`/atividades?responsavel=${person.id}`}
        personFirstName={firstName}
      />
    </PageShell>
  );
}
