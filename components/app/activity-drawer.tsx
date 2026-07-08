"use client";

import * as React from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  ImageMinus,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

import { CategoryBadge } from "@/components/app/category-badge";
import { NewActivityButton } from "@/components/app/new-activity-button";
import { StatusBadge, STATUS_LABELS } from "@/components/app/status-badge";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getDrawerActivity,
  type DrawerActivity,
} from "@/lib/actions/activity-drawer";
import { cn } from "@/lib/utils";

// ── Context ──────────────────────────────────────────────────────────

type ActivityDrawerCtx = {
  openActivity: (id: string) => void;
};

const Ctx = React.createContext<ActivityDrawerCtx>({
  openActivity: () => {},
});

export function useActivityDrawer() {
  return React.useContext(Ctx);
}

// ── Provider ─────────────────────────────────────────────────────────

export function ActivityDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [activity, setActivity] = React.useState<DrawerActivity | null>(null);
  const [loading, setLoading] = React.useState(false);

  const openActivity = React.useCallback((id: string) => {
    setLoading(true);
    setOpen(true);
    getDrawerActivity(id).then((data) => {
      setActivity(data);
      setLoading(false);
    });
  }, []);

  const ctx = React.useMemo(() => ({ openActivity }), [openActivity]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <Sheet open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {loading ? (
            <DrawerSkeleton />
          ) : activity ? (
            <DrawerBody activity={activity} />
          ) : (
            <SheetHeader>
              <SheetTitle>Atividade não encontrada</SheetTitle>
              <SheetDescription>
                Esta atividade não existe ou está fora do seu escopo.
              </SheetDescription>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-px w-full bg-border" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  return format(
    parseISO(value),
    withTime ? "dd MMM yyyy 'às' HH:mm" : "dd MMM yyyy",
    { locale: ptBR }
  );
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

const EVENT_LABELS: Record<string, string> = {
  criada: "Atividade criada",
  editada: "Atividade editada",
  status_alterado: "Status alterado",
  foto_adicionada: "Foto adicionada",
  foto_removida: "Foto removida",
  execucao_registrada: "Execução registrada",
  reaberta: "Atividade reaberta",
};

function eventIcon(type: string, description: string | null): LucideIcon {
  if (type === "status_alterado" && description?.includes('para "Concluída"')) {
    return CheckCircle2;
  }
  const icons: Record<string, LucideIcon> = {
    criada: Plus,
    editada: Pencil,
    status_alterado: RefreshCw,
    foto_adicionada: Camera,
    foto_removida: ImageMinus,
    execucao_registrada: ClipboardCheck,
    reaberta: RotateCcw,
  };
  return icons[type] ?? RefreshCw;
}

function statusContextLabel(activity: DrawerActivity): string | null {
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

// ── Drawer body ──────────────────────────────────────────────────────

function DrawerBody({ activity }: { activity: DrawerActivity }) {
  const isOpen =
    activity.status === "planejada" ||
    activity.status === "em_andamento" ||
    activity.status === "atrasada";

  const executionEvent = activity.events.find(
    (event) =>
      event.type === "execucao_registrada" &&
      event.description &&
      event.description.trim().length > 0
  );

  const contextLabel = statusContextLabel(activity);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8 text-lg leading-snug">
          {activity.title}
        </SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          <StatusBadge status={activity.status} className="px-2.5 py-0.5" />
          {activity.category && (
            <CategoryBadge category={activity.category} />
          )}
          {contextLabel && (
            <span className="text-xs text-muted-foreground">
              {contextLabel}
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-6 pb-6">
        {/* Actions */}
        <div className="flex items-center gap-2">
          {isOpen && (
            <NewActivityButton
              mode="registrar"
              label="Registrar"
              size="sm"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`/atividades/${activity.id}`} />}
          >
            <ExternalLink className="size-3.5" />
            Abrir página
          </Button>
        </div>

        <Separator />

        {/* Description */}
        {activity.description && (
          <p className="text-sm leading-relaxed">{activity.description}</p>
        )}

        {/* Details grid */}
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <DetailRow label="Canal" value={activity.channelName} />
          <DetailRow
            label="Local"
            value={
              activity.branchName
                ? `${activity.branchName}${activity.branchCity ? ` — ${activity.branchCity}` : ""}`
                : "Canal geral"
            }
          />
          <DetailRow
            label="Meta vinculada"
            value={activity.problemTitle ?? "Sem meta"}
          />
          <DetailRow
            label="Prazo"
            value={activity.dueDate ? formatDate(activity.dueDate) : "Sem prazo"}
            className={activity.overdue ? "text-red-600 dark:text-red-400 font-medium" : ""}
          />
          <DetailRow
            label="Criada em"
            value={formatDate(activity.createdAt, true)}
          />
          {activity.completedAt && (
            <DetailRow
              label="Concluída em"
              value={formatDate(activity.completedAt, true)}
            />
          )}
        </dl>

        {/* Assignees */}
        {activity.assignees.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Responsáveis</p>
            <div className="flex items-center gap-2">
              <AvatarGroup>
                {activity.assignees.slice(0, 4).map((a) => (
                  <Avatar key={a.id} size="sm">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(a.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <span className="text-sm">
                {activity.assignees.map((a) => a.name).join(", ")}
              </span>
            </div>
          </div>
        )}

        {/* Execution description */}
        {executionEvent && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Descrição da execução
              </p>
              <p className="text-sm leading-relaxed">
                {executionEvent.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Registrada{" "}
                {formatDistanceToNow(parseISO(executionEvent.createdAt), {
                  locale: ptBR,
                  addSuffix: true,
                })}
              </p>
            </div>
          </>
        )}

        {/* Photos count */}
        {activity.photos.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Camera className="size-4" />
            {activity.photos.length}{" "}
            {activity.photos.length === 1 ? "foto" : "fotos"}
          </div>
        )}

        {/* Timeline */}
        <Separator />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Linha do tempo
          </p>
          <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-px before:bg-border">
            {activity.events.map((event) => {
              const Icon = eventIcon(event.type, event.description);
              return (
                <li key={event.id} className="relative flex gap-2.5">
                  <span className="z-10 flex size-5 shrink-0 items-center justify-center rounded-full border bg-background">
                    <Icon className="size-2.5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-medium">
                      {EVENT_LABELS[event.type] ?? event.type}
                    </p>
                    {event.description && (
                      <p className="text-[11px] text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(parseISO(event.createdAt), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm tabular-nums", className)}>{value}</dd>
    </div>
  );
}
