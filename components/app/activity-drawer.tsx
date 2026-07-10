"use client";

import * as React from "react";
import { Dialog as PanelPrimitive } from "@base-ui/react/dialog";
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
  XIcon,
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
      <PanelPrimitive.Root
        open={open}
        onOpenChange={(o) => {
          if (!o) setOpen(false);
        }}
      >
        <PanelPrimitive.Portal>
          {/* Overlay com blur — mesmo tom do command palette (Ctrl K) */}
          <PanelPrimitive.Backdrop
            data-slot="activity-panel-overlay"
            className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm"
          />
          {/* Painel flutuante — desliza da direita, flutua com margem */}
          <PanelPrimitive.Popup
            data-slot="activity-panel"
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden bg-card text-sm text-card-foreground shadow-2xl",
              "transition-[transform,opacity] duration-300 ease-out",
              "data-ending-style:translate-x-[calc(100%+1.5rem)] data-starting-style:translate-x-[calc(100%+1.5rem)]",
              // Mobile: tela cheia, sem margem nem borda
              "inset-0 rounded-none border-0",
              // Desktop: flutua com 16px de margem, 45% da largura
              "sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[45vw] sm:min-w-[520px] sm:max-w-[720px] sm:rounded-2xl sm:border"
            )}
          >
            {loading ? (
              <DrawerSkeleton />
            ) : activity ? (
              <DrawerBody activity={activity} />
            ) : (
              <div className="flex flex-col gap-1.5 p-6 pr-14">
                <PanelPrimitive.Title className="text-xl font-semibold">
                  Atividade não encontrada
                </PanelPrimitive.Title>
                <PanelPrimitive.Description className="text-sm text-muted-foreground">
                  Esta atividade não existe ou está fora do seu escopo.
                </PanelPrimitive.Description>
              </div>
            )}
            {/* Botão de fechar (canto superior direito) */}
            <PanelPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-4 top-4 rounded-full bg-secondary"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Fechar</span>
            </PanelPrimitive.Close>
          </PanelPrimitive.Popup>
        </PanelPrimitive.Portal>
      </PanelPrimitive.Root>
    </Ctx.Provider>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <>
      {/* Header skeleton (fixo) */}
      <div className="shrink-0 border-b p-6 pr-14">
        <PanelPrimitive.Title className="sr-only">
          Carregando atividade
        </PanelPrimitive.Title>
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      {/* Corpo skeleton */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </>
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
  const headerContext = [
    activity.channelName,
    activity.branchName ?? "Canal geral",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {/* Header fixo — bloco de RECONHECIMENTO */}
      <div className="shrink-0 border-b p-6 pr-14">
        <PanelPrimitive.Title className="text-xl font-semibold leading-snug line-clamp-2">
          {activity.title}
        </PanelPrimitive.Title>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={activity.status} className="px-2.5 py-0.5" />
          {activity.category && (
            <CategoryBadge category={activity.category} />
          )}
        </div>
        <PanelPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
          {headerContext}
        </PanelPrimitive.Description>
      </div>

      {/* Corpo com scroll — blocos de DETALHE */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        {contextLabel && (
          <p className="text-xs text-muted-foreground">{contextLabel}</p>
        )}
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
          <ol className="relative flex flex-col gap-4 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-px before:bg-border">
            {activity.events.map((event) => {
              const Icon = eventIcon(event.type, event.description);
              return (
                <li key={event.id} className="relative flex gap-3">
                  <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                    <Icon className="size-3 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">
                      {EVENT_LABELS[event.type] ?? event.type}
                    </p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
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
