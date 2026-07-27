"use client";

import * as React from "react";
import Link from "next/link";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChartColumn,
  ClipboardList,
  StickyNote,
  Target,
  X,
} from "lucide-react";

import { ActivitiesTable } from "@/components/app/activities-table";
import { ActivityForm } from "@/components/app/activity-form";
import { MetaWizard } from "@/components/app/meta-wizard";
import { PageShell } from "@/components/app/page-shell";
import { ProblemsTab } from "@/components/app/problems-tab";
import { NotesView } from "./notas/notes-view";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { SearchableSelect } from "@/components/app/searchable-select";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import type {
  ActivityRow,
  ChannelDetail,
  ProblemRow,
  ResponsibleOption,
} from "@/lib/db/channels";
import type { ChannelNote } from "@/lib/db/notes";
import { isLateActivity } from "@/lib/db/status";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Hub do plano do canal: métricas, visão geral (gráficos + críticas),
 * problemas e atividades — tudo reagindo ao filtro global de filial.
 */
export function ChannelView({
  channel,
  problems,
  activities,
  responsibles,
  canEdit,
  notes,
  currentUserId,
  currentUser,
}: {
  channel: ChannelDetail;
  problems: ProblemRow[];
  activities: ActivityRow[];
  responsibles: ResponsibleOption[];
  canEdit: boolean;
  notes: ChannelNote[];
  currentUserId: string;
  currentUser: { name: string; avatarUrl: string | null };
}) {
  const isMobile = useIsMobile();
  const { openWizard } = useWizardProvider();
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);
  const [activityFormOpen, setActivityFormOpen] = React.useState(false);
  const [metaWizardOpen, setMetaWizardOpen] = React.useState(false);
  // Metas saem da aba e viram drawer, igual ao RTV: a aba obrigava a
  // trocar de contexto (perdia a tabela de atividades de vista) para
  // consultar um plano que é referência, não destino de trabalho.
  const [problemsOpen, setProblemsOpen] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [editingActivity, setEditingActivity] =
    React.useState<ActivityRow | null>(null);

  const plan = channel.plan;

  const filtered = React.useMemo(
    () =>
      branchFilter
        ? activities.filter((activity) => activity.branchId === branchFilter)
        : activities,
    [activities, branchFilter]
  );

  const metrics = React.useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(
      (activity) => activity.status === "concluida"
    ).length;
    const late = filtered.filter(isLateActivity).length;
    // Há quanto tempo esse canal dá sinal de vida. É o único dado do
    // cockpit que NÃO dá para deduzir do resto da tela (contagem de
    // metas e de atividades já está logo abaixo) e é o que decide se o
    // gestor precisa cobrar alguém hoje.
    const lastDone = filtered.reduce<string | null>((latest, activity) => {
      if (!activity.completedAt) return latest;
      return !latest || activity.completedAt > latest
        ? activity.completedAt
        : latest;
    }, null);
    const daysSinceLast = lastDone
      ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(lastDone)))
      : null;
    return {
      total,
      completed,
      completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      late,
      daysSinceLast,
      lastDone,
    };
  }, [filtered]);

  // Criar atividade usa o wizard canônico (mesma experiência do RTV,
  // com a bifurcação Agendar × Registrar); o form antigo fica só para
  // edição.
  function openCreateActivity() {
    openWizard({ channelId: channel.id });
  }

  function openEditActivity(activity: ActivityRow) {
    setEditingActivity(activity);
    setActivityFormOpen(true);
  }

  /**
   * Cockpit do canal no StatCard canônico (era um card à mão, com outro
   * tamanho de número e sem cor — a mesma informação com duas caras).
   * A cor de cada número é a do status que ele conta; "Sem meta"
   * herda o teal da pendência de mesmo nome.
   *
   * "Vencem em 7 dias" saiu: prazo próximo não é problema (a atividade
   * está no prazo) e o card gastava um quarto da fileira para dizer que
   * o plano está funcionando. No lugar entra o débito real de vínculo.
   */
  const metricCards = [
    {
      label: "Total de atividades",
      value: metrics.total.toString(),
      tone: "neutral" as const,
      sublabel: "no plano",
      valueClass: "",
    },
    {
      label: "Concluídas",
      value: `${metrics.completed}`,
      tone: "success" as const,
      sublabel: `${metrics.completedPercent}% do total`,
      valueClass: "",
    },
    {
      label: "Atrasadas",
      value: metrics.late.toString(),
      tone: "warning" as const,
      sublabel: metrics.late === 1 ? "vencida em aberto" : "vencidas em aberto",
      valueClass: "",
    },
    {
      label: "Último registro",
      value:
        metrics.daysSinceLast === null
          ? "—"
          : metrics.daysSinceLast === 0
            ? "hoje"
            : `${metrics.daysSinceLast}d`,
      // Âmbar só quando o canal está no escuro (30+ dias sem execução).
      tone:
        metrics.daysSinceLast !== null && metrics.daysSinceLast >= 30
          ? ("warning" as const)
          : ("neutral" as const),
      sublabel: metrics.lastDone
        ? format(parseISO(metrics.lastDone), "dd MMM yyyy", { locale: ptBR })
        : "nenhuma execução registrada",
      valueClass: "",
    },
  ];

  return (
    <PageShell
      title={channel.name}
      description={`${channel.region} · ${channel.branches.length} filiais`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {plan ? (
            <Select
              value={plan.id}
              items={[{ value: plan.id, label: plan.harvest }]}
            >
              <SelectTrigger size="sm" aria-label="Safra do plano">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={plan.id}>{plan.harvest}</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          {plan ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              nativeButton={false}
              render={<Link href={`/canais/${channel.id}/relatorio`} />}
            >
              <ChartColumn />
              Relatório de safra
            </Button>
          ) : null}
          {/* Notas em drawer: é material de consulta do canal, não uma
              tela de destino — mandar o usuário para outra rota fazia
              perder o contexto do plano para ler um bilhete. */}
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setNotesOpen(true)}
          >
            <StickyNote />
            Notas
            {notes.length > 0 ? (
              <span className="tabular-nums text-muted-foreground">
                {notes.length}
              </span>
            ) : null}
          </Button>
          {plan ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setProblemsOpen(true)}
            >
              <Target />
              Metas
              <span className="tabular-nums text-muted-foreground">
                {problems.length}
              </span>
            </Button>
          ) : null}
          {/* "Nova atividade" só no topbar — a ação universal tem UM
              lugar, senão o usuário procura em vários. */}
        </div>
      }
    >
      {!plan ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList />
                </EmptyMedia>
                <EmptyTitle>Sem plano ativo</EmptyTitle>
                <EmptyDescription>
                  Este canal ainda não tem um plano de safra ativo.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              options={channel.branches.map((branch) => ({
                value: branch.id,
                label: branch.name,
              }))}
              value={branchFilter}
              onValueChange={setBranchFilter}
              placeholder="Todas as filiais"
              className="w-56"
            />
            {branchFilter ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBranchFilter(null)}
              >
                Limpar filtro
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((metric) => (
              <StatCard
                key={metric.label}
                title={metric.label}
                value={metric.value}
                sublabel={metric.sublabel}
                tone={metric.tone}
                valueClassName={metric.valueClass}
              />
            ))}
          </div>

          {/* Sem aba "Visao geral": os graficos repetiam, em barras, o
              que os 4 KPIs acima ja dizem em numero, e "Atividades
              criticas" era um recorte da propria lista logo abaixo.
              Com uma aba so, o Tabs virou moldura vazia — a lista e a
              tela. */}
          <ActivitiesTable
            data={filtered}
            problems={problems.map((problem) => ({
              value: problem.id,
              label: problem.title,
            }))}
            branches={channel.branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            }))}
            responsibles={responsibles.map((responsible) => ({
              value: responsible.id,
              label: responsible.name,
            }))}
            canEdit={canEdit}
            onCreate={openCreateActivity}
            onEdit={openEditActivity}
          />

          {/* Metas em drawer — mesma experiência do RTV. A diferença do
              gestor é poder criar meta aqui dentro (ProblemsTab já traz
              o CTA quando canEdit). */}
          <Drawer
            open={problemsOpen}
            onOpenChange={setProblemsOpen}
            modal
            swipeDirection={isMobile ? "down" : "right"}
          >
            <DrawerContent
              className={cn(
                !isMobile &&
                  "data-[swipe-axis=x]:sm:[--drawer-content-width:44rem]"
              )}
            >
              <DrawerTitle className="sr-only">Metas do plano</DrawerTitle>
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-6 py-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground">
                    Metas do plano
                  </p>
                  <DrawerDescription className="mt-0.5">
                    As metas desta safra em {channel.name}.
                  </DrawerDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setProblemsOpen(false)}
                  className="shrink-0"
                >
                  <X className="size-4" />
                  <span className="sr-only">Fechar</span>
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <ProblemsTab
                  planId={plan.id}
                  problems={problems}
                  activities={filtered}
                  canEdit={canEdit}
                  channelName={channel.name}
                />
              </div>
            </DrawerContent>
          </Drawer>

          <MetaWizard
            open={metaWizardOpen}
            onOpenChange={setMetaWizardOpen}
            planId={plan.id}
            channelName={channel.name}
          />

          <ActivityForm
            open={activityFormOpen}
            onOpenChange={setActivityFormOpen}
            planId={plan.id}
            activity={editingActivity}
            options={{
              problems: problems.map((problem) => ({
                value: problem.id,
                label: problem.title,
              })),
              branches: channel.branches.map((branch) => ({
                value: branch.id,
                label: branch.name,
              })),
              responsibles: responsibles.map((responsible) => ({
                value: responsible.id,
                label: responsible.name,
              })),
            }}
          />
        </>
      )}

      {/* Notas — fora do bloco do plano: um canal sem plano ainda tem
          histórico para registrar e consultar. */}
      <Drawer
        open={notesOpen}
        onOpenChange={setNotesOpen}
        modal
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent
          className={cn(
            !isMobile && "data-[swipe-axis=x]:sm:[--drawer-content-width:44rem]"
          )}
        >
          <DrawerTitle className="sr-only">Notas do canal</DrawerTitle>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">
                Notas do canal
              </p>
              <DrawerDescription className="mt-0.5">
                Aprendizados e observações do time sobre {channel.name}.
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setNotesOpen(false)}
              className="shrink-0"
            >
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <NotesView
              channelId={channel.id}
              notes={notes}
              currentUserId={currentUserId}
              currentUser={currentUser}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </PageShell>
  );
}
