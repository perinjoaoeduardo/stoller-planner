import Link from "next/link";
import { ChevronRight, PartyPopper } from "lucide-react";

import { ActivityLink } from "@/components/app/activity-link";
import { PendenciasKpis } from "@/components/app/pendencias-kpis";
import {
  StatusBadge,
  type ActivityStatus,
} from "@/components/shared/status-badge";
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
  type PendenciesSummary,
  type PendencyType,
} from "@/lib/db/pendencias";
import { cn } from "@/lib/utils";

/**
 * Visão de faxina compartilhada entre /pendencias (DSM) e a aba
 * "Pendências" do /acompanhamento (CX). Server Component: renderiza as
 * listas já filtradas por `activeFilter` (vem do ?tipo= via page). Os 3
 * KPIs no topo são um client component (PendenciasKpis) que empurra a
 * URL, e o próprio page re-renderiza com o novo filtro.
 */

/**
 * Pendência tem família de cor PRÓPRIA — fora do vocabulário de status.
 * Âmbar é "atrasada", azul é "planejada", verde é "concluída": usar
 * qualquer um deles aqui faria o usuário ler alarme de prazo onde só
 * falta um anexo. Violeta = falta foto, teal = falta meta.
 */
const ISSUE_BADGE_CLASS: Record<PendencyType, string> = {
  sem_foto: "border-transparent bg-pend-foto-bg text-pend-foto-fg",
  sem_problema: "border-transparent bg-pend-meta-bg text-pend-meta-fg",
  sem_categoria:
    "border-muted-foreground/40 bg-muted-foreground/10 text-muted-foreground",
};

const NEGATIVE_STATUSES = new Set<ActivityStatus>(["atrasada", "nao_feita"]);

function IssueBadge({
  issue,
  dim,
}: {
  issue: PendencyType;
  /** Quando há filtro ativo e este não é o selecionado, fica neutro. */
  dim?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0",
        dim
          ? "border-border bg-muted text-muted-foreground"
          : ISSUE_BADGE_CLASS[issue]
      )}
    >
      {PENDENCY_LABELS[issue]}
    </Badge>
  );
}

export function PendenciasView({
  data,
  showDsm = false,
  activeFilter = null,
  onlyMine = false,
  canToggleScope = false,
  channelFilter = null,
  personFilter = null,
}: {
  data: PendenciesSummary;
  /** CX vê o DSM responsável por canal; para o DSM é redundante. */
  showDsm?: boolean;
  activeFilter?: PendencyType | null;
  /** Lista já veio estreitada às atividades do usuário. */
  onlyMine?: boolean;
  /** RTV não alterna (só existe o escopo dele); DSM/CX sim. */
  canToggleScope?: boolean;
  /** Recortes de ?canal= e ?pessoa= (gestor cobra por canal e por gente). */
  channelFilter?: string | null;
  personFilter?: string | null;
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
              <EmptyTitle>
                {onlyMine
                  ? "Nenhuma pendência sua por aqui"
                  : "Nenhuma pendência por aqui"}
              </EmptyTitle>
              <EmptyDescription>
                {onlyMine
                  ? "Seus registros concluídos estão completos. Desligue “Só minhas” para ver as do time."
                  : "Todos os registros concluídos têm foto, meta vinculada e categoria. Plano organizado!"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  /**
   * Opções dos filtros saem dos próprios dados (só aparece quem tem
   * pendência) — um seletor com nomes sem débito nenhum é caminho para
   * lista vazia.
   */
  const channelOptions = data.channels.map((channel) => ({
    value: channel.channelId,
    label: channel.channelName,
  }));
  const peopleSeen = new Map<string, string>();
  for (const channel of data.channels) {
    for (const activity of channel.activities) {
      if (activity.responsibleId && activity.responsibleName) {
        peopleSeen.set(activity.responsibleId, activity.responsibleName);
      }
    }
  }
  const personOptions = [...peopleSeen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Contadores dos KPIs continuam refletindo os totais reais — filtrar
  // não muda o tamanho do débito, só o foco.
  const filteredChannels = data.channels
    .filter((channel) => !channelFilter || channel.channelId === channelFilter)
    .map((channel) => {
      const activities = channel.activities.filter(
        (activity) =>
          (!activeFilter || activity.issues.includes(activeFilter)) &&
          (!personFilter || activity.responsibleId === personFilter)
      );
      return { ...channel, activities, total: activities.length };
    })
    .filter((channel) => channel.total > 0);

  const filteredTotal = filteredChannels.reduce(
    (sum, channel) => sum + channel.total,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <PendenciasKpis
        totalsByType={data.totalsByType}
        activeFilter={activeFilter}
        onlyMine={onlyMine}
        canToggleScope={canToggleScope}
        channelOptions={channelOptions}
        channelFilter={channelFilter}
        personOptions={personOptions}
        personFilter={personFilter}
      />

      {activeFilter ? (
        <p className="text-sm text-muted-foreground">
          Mostrando{" "}
          <span className="font-medium text-foreground">
            {PENDENCY_LABELS[activeFilter].toLowerCase()}
          </span>
          {" · "}
          <span className="tabular-nums">{filteredTotal}</span>{" "}
          {filteredTotal === 1 ? "atividade" : "atividades"} em{" "}
          <span className="tabular-nums">{filteredChannels.length}</span>{" "}
          {filteredChannels.length === 1 ? "canal" : "canais"}
        </p>
      ) : null}

      {filteredChannels.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PartyPopper />
                </EmptyMedia>
                <EmptyTitle>Nada pendente deste tipo</EmptyTitle>
                <EmptyDescription>
                  Nenhuma atividade se encaixa no filtro selecionado.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        filteredChannels.map((channel) => (
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
                <ActivityLink
                  key={activity.id}
                  activityId={activity.id}
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
                    {activity.issues.map((issue) => (
                      <IssueBadge
                        key={issue}
                        issue={issue}
                        dim={activeFilter !== null && issue !== activeFilter}
                      />
                    ))}
                    {NEGATIVE_STATUSES.has(activity.status) ? (
                      <StatusBadge status={activity.status} />
                    ) : null}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </ActivityLink>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
