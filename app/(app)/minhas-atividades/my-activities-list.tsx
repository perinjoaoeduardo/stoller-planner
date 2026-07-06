"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  CalendarClock,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

import {
  FieldActivityCard,
  type FieldActivityCardData,
} from "@/components/app/field-activity-card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { FieldActivity } from "@/lib/db/execution";
import { cn } from "@/lib/utils";

type ChipFilter = "todas" | "minhas" | "filial";

const CHIPS: { value: ChipFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "minhas", label: "Minhas" },
  { value: "filial", label: "Da minha filial" },
];

const OPEN = new Set(["planejada", "em_andamento", "atrasada"]);

function SectionHeader({
  icon: Icon,
  title,
  count,
  className,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-semibold text-muted-foreground",
        className
      )}
    >
      <Icon className="size-4" />
      {title}
      <span className="tabular-nums">({count})</span>
    </div>
  );
}

function CardStack({ activities }: { activities: FieldActivityCardData[] }) {
  return (
    <div className="flex flex-col gap-2">
      {activities.map((activity) => (
        <FieldActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

export function MyActivitiesList({
  activities,
}: {
  activities: FieldActivity[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = React.useTransition();
  const [chip, setChip] = React.useState<ChipFilter>("todas");

  const filtered = React.useMemo(() => {
    if (chip === "minhas") {
      return activities.filter((activity) => activity.isMine);
    }
    if (chip === "filial") {
      return activities.filter((activity) => activity.isMyBranch);
    }
    return activities;
  }, [activities, chip]);

  const groups = React.useMemo(() => {
    const open = filtered.filter((activity) => OPEN.has(activity.status));
    const late = open.filter((activity) => activity.status === "atrasada");
    const notLate = open.filter((activity) => activity.status !== "atrasada");
    const soon = notLate.filter(
      (activity) =>
        activity.dueDate !== null &&
        differenceInCalendarDays(parseISO(activity.dueDate), new Date()) <= 7
    );
    const soonIds = new Set(soon.map((activity) => activity.id));
    const later = notLate.filter((activity) => !soonIds.has(activity.id));
    const closed = filtered.filter((activity) => !OPEN.has(activity.status));
    return { late, soon, later, closed };
  }, [filtered]);

  const hasAnything =
    groups.late.length + groups.soon.length + groups.later.length > 0 ||
    groups.closed.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <div className="-my-1 flex flex-1 gap-2 overflow-x-auto py-1">
          {CHIPS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setChip(item.value)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                chip === item.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground"
          aria-label="Atualizar lista"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {!hasAnything ? (
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>Nada por aqui</EmptyTitle>
            <EmptyDescription>
              Nenhuma atividade no recorte atual. Troque o filtro acima ou
              registre uma execução avulsa.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {groups.late.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionHeader
            icon={CircleAlert}
            title="Atrasadas"
            count={groups.late.length}
            className="text-amber-600 dark:text-amber-400"
          />
          <CardStack activities={groups.late} />
        </section>
      ) : null}

      {groups.soon.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionHeader
            icon={CalendarClock}
            title="Próximas (7 dias)"
            count={groups.soon.length}
          />
          <CardStack activities={groups.soon} />
        </section>
      ) : null}

      {groups.later.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionHeader
            icon={CalendarDays}
            title="Depois"
            count={groups.later.length}
          />
          <CardStack activities={groups.later} />
        </section>
      ) : null}

      {groups.closed.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-2 rounded-xl border bg-card px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/50">
            <CheckCheck className="size-4" />
            Concluídas e encerradas
            <span className="tabular-nums">({groups.closed.length})</span>
            <ChevronDown className="ml-auto size-4 transition-transform group-data-[panel-open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-col gap-2">
              {groups.closed.map((activity) => (
                <FieldActivityCard
                  key={activity.id}
                  activity={activity}
                  showRegister={false}
                  className="opacity-80"
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
