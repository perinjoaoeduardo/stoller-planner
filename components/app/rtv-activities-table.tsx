"use client";

import * as React from "react";
import Link from "next/link";

import { ChevronRight } from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import {
  ActivityTable,
  type ActivityTableColumn,
} from "@/components/shared/activity-table";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { ActivityCard } from "@/components/app/activity-card";
import {
  StatusBadge,
  type ActivityStatus,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CheckCircle2 } from "lucide-react";
import type { ActivityCategory } from "@/lib/config";

const HOME_COLUMNS: ActivityTableColumn[] = [
  "atividade",
  "prazo",
  "status",
  "acao",
];

export type RtvActivityRow = {
  id: string;
  title: string;
  status: ActivityStatus;
  category: ActivityCategory | null;
  dueDate: string | null;
  completedAt: string | null;
  branchName: string | null;
  channelName: string;
};

/**
 * Tabela "Minhas atividades" da home do RTV: até 8 abertas + link para
 * ver todas. Desktop = Table densa; mobile = cards empilhados (viewport
 * apertado não comporta a table sem virar rolagem horizontal grosseira).
 */
export function RtvActivitiesTable({
  activities,
  totalOpen,
  profileId,
  profileName,
}: {
  activities: RtvActivityRow[];
  totalOpen: number;
  profileId: string;
  profileName: string;
}) {
  const { openActivity } = useActivityDrawer();
  const { openWizard } = useWizardProvider();
  const hasMore = totalOpen > activities.length;

  if (activities.length === 0) {
    return (
      <Empty className="my-2 rounded-2xl border border-dashed py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2 />
          </EmptyMedia>
          <EmptyTitle>Nenhuma atividade aberta</EmptyTitle>
          <EmptyDescription>
            Você está em dia com o que estava planejado.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      {/* Desktop — tabela canônica */}
      <div className="hidden md:block">
        <ActivityTable
          activities={activities}
          columns={HOME_COLUMNS}
          onRowClick={(activity) => openActivity(activity.id)}
          rowAction="registrar"
          onRegister={(activity) =>
            openWizard({ mode: "registrar", activityId: activity.id })
          }
          deadlineFormat="relative"
        />
      </div>

      {/* Mobile — cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            showCanal
            activity={{
              id: activity.id,
              title: activity.title,
              status: activity.status,
              category: activity.category,
              dueDate: activity.dueDate,
              completedAt: activity.completedAt,
              branchName: activity.branchName,
              channelName: activity.channelName,
              assignees: [{ id: profileId, name: profileName }],
            }}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            nativeButton={false}
            render={<Link href="/minhas-atividades" />}
          >
            Ver todas as {totalOpen} atividades abertas
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </>
  );
}
