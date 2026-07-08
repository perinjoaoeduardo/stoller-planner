"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ChevronRight } from "lucide-react";

import { ActivityCard } from "@/components/app/activity-card";
import {
  StatusBadge,
  type ActivityStatus,
} from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeDue } from "@/lib/plan-utils";
import type { ActivityCategory } from "@/lib/config";

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
  const router = useRouter();
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
      {/* Desktop — table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atividade</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => {
              const overdue = activity.status === "atrasada";
              return (
                <TableRow
                  key={activity.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/atividades/${activity.id}`)}
                >
                  <TableCell className="max-w-72 truncate font-medium">
                    {activity.title}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {activity.branchName ?? (
                      <span className="italic">Canal geral</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "whitespace-nowrap tabular-nums",
                      overdue
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatRelativeDue(activity.dueDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={activity.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      nativeButton={false}
                      render={
                        <Link
                          href={`/registrar?atividade=${activity.id}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Camera />
                          Registrar
                        </Link>
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
