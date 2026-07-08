import Link from "next/link";
import { CameraOff, ChevronRight, PartyPopper, Tag, Unlink } from "lucide-react";

import { CategoryBadge } from "@/components/app/category-badge";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
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
  PENDENCY_LABELS,
  PENDENCY_TYPES,
  type PendenciesSummary,
  type PendencyType,
} from "@/lib/db/pendencias";
import { cn } from "@/lib/utils";

/**
 * Visão de faxina compartilhada entre a página /pendencias (DSM) e a aba
 * "Pendências" do /acompanhamento (CX). Server Component: só links —
 * cada item leva ao detalhe da atividade para resolver na hora.
 */

const ISSUE_CONFIG: Record<
  PendencyType,
  { icon: typeof CameraOff; className: string; description: string }
> = {
  sem_foto: {
    icon: CameraOff,
    className:
      "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
    description: "Atividades concluídas sem nenhuma foto de evidência.",
  },
  sem_problema: {
    icon: Unlink,
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    description:
      "Atividades concluídas sem vínculo com uma meta do plano.",
  },
  sem_categoria: {
    icon: Tag,
    className:
      "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-400",
    description: "Atividades sem categoria definida.",
  },
};

function IssueBadge({ issue }: { issue: PendencyType }) {
  const config = ISSUE_CONFIG[issue];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("shrink-0", config.className)}>
      <Icon aria-hidden="true" />
      {PENDENCY_LABELS[issue]}
    </Badge>
  );
}

export function PendenciasView({
  data,
  showDsm = false,
}: {
  data: PendenciesSummary;
  /** CX vê o DSM responsável por canal; para o DSM é redundante. */
  showDsm?: boolean;
}) {
  if (data.total === 0) {
    return (
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PartyPopper />
              </EmptyMedia>
              <EmptyTitle>Nenhuma pendência por aqui</EmptyTitle>
              <EmptyDescription>
                Todos os registros concluídos têm foto, meta vinculada e
                categoria. Plano organizado!
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Contadores gerais por tipo */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PENDENCY_TYPES.map((type) => {
          const config = ISSUE_CONFIG[type];
          const Icon = config.icon;
          return (
            <Card key={type} className="gap-2">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardDescription>{PENDENCY_LABELS[type]}</CardDescription>
                <Icon className="size-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {data.totalsByType[type]}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {config.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Um card por canal, piores primeiro */}
      {data.channels.map((channel) => (
        <Card key={channel.channelId} className="gap-3">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <CardTitle className="text-base leading-snug">
                <Link
                  href={`/canais/${channel.channelId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {channel.channelName}
                </Link>
              </CardTitle>
              <CardDescription className="truncate">
                {channel.regionName}
                {showDsm && channel.dsmName ? ` · DSM ${channel.dsmName}` : ""}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {channel.total}{" "}
              {channel.total === 1 ? "pendência" : "pendências"}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {channel.activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/atividades/${activity.id}`}
                className="flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {activity.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activity.branchName ?? "Sem filial"}
                    {activity.responsibleName
                      ? ` · ${activity.responsibleName}`
                      : ""}
                  </span>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {activity.category ? (
                    <CategoryBadge
                      category={activity.category}
                      className="hidden lg:inline-flex"
                    />
                  ) : null}
                  {activity.issues.map((issue) => (
                    <IssueBadge key={issue} issue={issue} />
                  ))}
                  <StatusBadge status={activity.status} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
