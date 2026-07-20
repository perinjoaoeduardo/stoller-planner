"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarClock,
  ChartColumn,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  ClipboardList,
  Plus,
} from "lucide-react";

import { ActivitiesByProblemChart } from "@/components/app/activities-by-problem-chart";
import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { ActivitiesTable } from "@/components/app/activities-table";
import { useActivityDrawer } from "@/components/app/activity-drawer";
import { ActivityForm } from "@/components/app/activity-form";
import { MetaWizard } from "@/components/app/meta-wizard";
import { PageShell } from "@/components/app/page-shell";
import { ProblemsTab } from "@/components/app/problems-tab";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { SearchableSelect } from "@/components/app/searchable-select";
import {
  ACTIVITY_STATUSES,
  StatusBadge,
} from "@/components/shared/status-badge";
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
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ActivityRow,
  ChannelDetail,
  ProblemRow,
  ResponsibleOption,
} from "@/lib/db/channels";
import { isLateActivity, todayISO } from "@/lib/db/status";

const PENDING = new Set(["planejada", "atrasada"]);

function addDaysISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

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
  defaultTab,
}: {
  channel: ChannelDetail;
  problems: ProblemRow[];
  activities: ActivityRow[];
  responsibles: ResponsibleOption[];
  canEdit: boolean;
  defaultTab?: string;
}) {
  const { openActivity } = useActivityDrawer();
  const { openWizard } = useWizardProvider();
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);
  const [activityFormOpen, setActivityFormOpen] = React.useState(false);
  const [metaWizardOpen, setMetaWizardOpen] = React.useState(false);
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
    const today = todayISO();
    const weekAhead = addDaysISO(7);
    const dueSoon = filtered.filter(
      (activity) =>
        PENDING.has(activity.status) &&
        activity.status !== "atrasada" &&
        !!activity.dueDate &&
        activity.dueDate >= today &&
        activity.dueDate <= weekAhead
    ).length;
    return {
      total,
      completed,
      completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      late,
      dueSoon,
    };
  }, [filtered]);

  const byStatus = React.useMemo(
    () =>
      ACTIVITY_STATUSES.map((status) => ({
        status,
        total: filtered.filter((activity) => activity.status === status)
          .length,
      })),
    [filtered]
  );

  const byProblem = React.useMemo(() => {
    const rows = problems.map((problem) => ({
      label: problem.title,
      total: filtered.filter((activity) => activity.problemId === problem.id)
        .length,
    }));
    const unlinked = filtered.filter((activity) => !activity.problemId).length;
    rows.push({ label: "Sem meta vinculada", total: unlinked });
    return rows;
  }, [problems, filtered]);

  const critical = React.useMemo(
    () =>
      filtered
        .filter(
          (activity) => PENDING.has(activity.status) && !!activity.dueDate
        )
        .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
        .slice(0, 5),
    [filtered]
  );

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

  const metricCards = [
    {
      label: "Total de atividades",
      value: metrics.total.toString(),
      icon: ClipboardList,
    },
    {
      label: "Concluídas",
      value: `${metrics.completed} (${metrics.completedPercent}%)`,
      icon: CircleCheckBig,
    },
    {
      label: "Atrasadas",
      value: metrics.late.toString(),
      icon: CircleAlert,
    },
    {
      label: "Vencem em 7 dias",
      value: metrics.dueSoon.toString(),
      icon: CalendarClock,
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
          {canEdit && plan ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setMetaWizardOpen(true)}
              >
                <Plus />
                Nova meta
              </Button>
              <Button variant="brand" size="sm" className="h-9" onClick={openCreateActivity}>
                <Plus />
                Nova atividade
              </Button>
            </>
          ) : null}
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
              <Card key={metric.label} className="gap-2 py-4">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardDescription>{metric.label}</CardDescription>
                  <metric.icon className="size-4 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {metric.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs
            defaultValue={
              ["visao-geral", "problemas", "atividades"].includes(
                defaultTab ?? ""
              )
                ? defaultTab
                : "visao-geral"
            }
          >
            <TabsList>
              <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
              <TabsTrigger value="problemas">
                Metas
                <span className="ml-1 tabular-nums text-muted-foreground">
                  {problems.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="atividades">
                Atividades
                <span className="ml-1 tabular-nums text-muted-foreground">
                  {filtered.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visao-geral" className="mt-2">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Atividades por status</CardTitle>
                    <CardDescription>
                      Distribuição das atividades do plano em cada status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ActivitiesStatusChart data={byStatus} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Atividades por meta</CardTitle>
                    <CardDescription>
                      Onde o plano concentra esforço — e o débito de vínculo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ActivitiesByProblemChart data={byProblem} />
                  </CardContent>
                </Card>
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle>Atividades críticas</CardTitle>
                    <CardDescription>
                      As 5 pendentes mais atrasadas ou próximas do prazo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {critical.length === 0 ? (
                      <Empty className="py-8">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <CircleCheckBig />
                          </EmptyMedia>
                          <EmptyTitle>Nada crítico por aqui</EmptyTitle>
                          <EmptyDescription>
                            Nenhuma atividade pendente com prazo no recorte
                            atual.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      <ItemGroup>
                        {critical.map((activity, index) => (
                          <div key={activity.id}>
                            {index > 0 ? <ItemSeparator /> : null}
                            <Item
                              size="sm"
                              render={
                                <button
                                  type="button"
                                  onClick={() => openActivity(activity.id)}
                                  className="w-full cursor-pointer text-left"
                                />
                              }
                              className="hover:bg-muted/60"
                            >
                              <ItemContent>
                                <ItemTitle className="line-clamp-1">
                                  {activity.title}
                                </ItemTitle>
                                <ItemDescription>
                                  {activity.branchName ?? "Sem filial"} ·{" "}
                                  {activity.responsibleName ?? "Sem responsável"}
                                </ItemDescription>
                              </ItemContent>
                              <div className="flex shrink-0 items-center gap-3">
                                <span
                                  className={
                                    isLateActivity(activity)
                                      ? "text-xs font-medium text-red-600 tabular-nums dark:text-red-400"
                                      : "text-xs text-muted-foreground tabular-nums"
                                  }
                                >
                                  {activity.dueDate
                                    ? format(
                                        parseISO(activity.dueDate),
                                        "dd MMM yyyy",
                                        { locale: ptBR }
                                      )
                                    : "—"}
                                </span>
                                <StatusBadge status={activity.status} />
                                <ChevronRight className="size-4 text-muted-foreground" />
                              </div>
                            </Item>
                          </div>
                        ))}
                      </ItemGroup>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="problemas" className="mt-2">
              <ProblemsTab
                planId={plan.id}
                problems={problems}
                activities={filtered}
                canEdit={canEdit}
                channelName={channel.name}
              />
            </TabsContent>

            <TabsContent value="atividades" className="mt-2">
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
            </TabsContent>
          </Tabs>

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
    </PageShell>
  );
}
