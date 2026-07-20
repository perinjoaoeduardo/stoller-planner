"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import {
  ActivityRow as ActivityRowItem,
  type ActivityRowData,
} from "@/components/shared/activity-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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

/**
 * Card "Atividades" do perfil de pessoa: linhas canônicas (ActivityRow,
 * bolinha de status no IconBox), abertas primeiro, clique abre o painel
 * da atividade. "Ver todas" leva à visão global já filtrada na pessoa.
 */
export function PersonActivities({
  activities,
  viewAllHref,
  personFirstName,
}: {
  activities: ActivityRowData[];
  viewAllHref: string;
  personFirstName: string;
}) {
  const { openActivity } = useActivityDrawer();

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border px-4 py-4 sm:px-6 [.border-b]:pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4 text-muted-foreground" />
          Atividades
        </CardTitle>
        <CardDescription>
          O que está no nome de {personFirstName} nesta safra.
        </CardDescription>
        {activities.length > 0 ? (
          <CardAction>
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
          </CardAction>
        ) : null}
      </CardHeader>
      {activities.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>Nenhuma atividade no nome dela</EmptyTitle>
            <EmptyDescription>
              Nada atribuído a esta pessoa nos planos ativos.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div>
          {activities.map((activity) => (
            <ActivityRowItem
              key={activity.id}
              activity={activity}
              onOpen={() => openActivity(activity.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
