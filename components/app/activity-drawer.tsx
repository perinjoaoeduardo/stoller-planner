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
  Link2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { StatusCard } from "@/app/(app)/atividades/[id]/status-card";
import { PhotosCard } from "@/app/(app)/atividades/[id]/photos-card";
import { ProblemEditor } from "@/app/(app)/atividades/[id]/problem-editor";
import { CategoryBadge } from "@/components/app/category-badge";
import { StatusBadge, STATUS_LABELS } from "@/components/app/status-badge";
import { useWizardProvider } from "@/components/app/wizard-provider";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getDrawerActivity,
  type DrawerActivity,
} from "@/lib/actions/activity-drawer";
import { deleteActivity } from "@/lib/actions/plan";
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
  const currentId = React.useRef<string | null>(null);

  const openActivity = React.useCallback((id: string) => {
    currentId.current = id;
    setLoading(true);
    setOpen(true);
    getDrawerActivity(id).then((data) => {
      if (currentId.current === id) {
        setActivity(data);
        setLoading(false);
      }
    });
  }, []);

  // Recarrega a atividade atual sem piscar o skeleton — usado após uma
  // mutação inline (status, meta, foto) refletir no painel na hora.
  const refresh = React.useCallback(() => {
    const id = currentId.current;
    if (!id) return;
    getDrawerActivity(id).then((data) => {
      if (currentId.current === id) setActivity(data);
    });
  }, []);

  const close = React.useCallback(() => setOpen(false), []);

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
              <DrawerBody
                activity={activity}
                onRefresh={refresh}
                onClose={close}
              />
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
        <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-52 w-full animate-pulse rounded-xl bg-muted" />
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
  problema_vinculado: "Meta vinculada",
};

/** Ícone semântico por evento; conclusão ganha o check verde da vida. */
function eventIcon(type: string, description: string | null): LucideIcon {
  if (type === "status_alterado" && description?.includes('para "Concluída"')) {
    return CheckCircle2;
  }
  if (type === "execucao_registrada" && description) {
    return MessageSquare;
  }
  const icons: Record<string, LucideIcon> = {
    criada: Plus,
    editada: Pencil,
    status_alterado: RefreshCw,
    foto_adicionada: Camera,
    foto_removida: ImageMinus,
    execucao_registrada: ClipboardCheck,
    reaberta: RotateCcw,
    problema_vinculado: Link2,
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

function DrawerBody({
  activity,
  onRefresh,
  onClose,
}: {
  activity: DrawerActivity;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const { openWizard } = useWizardProvider();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const isOpen =
    activity.status === "planejada" ||
    activity.status === "em_andamento" ||
    activity.status === "atrasada";

  const headerContext = [
    activity.channelName,
    activity.branchName ?? "Canal geral",
  ]
    .filter(Boolean)
    .join(" · ");

  function handleRegistrar() {
    onClose();
    openWizard({
      mode: "registrar",
      activityId: activity.id,
      channelId: activity.channelId,
    });
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteActivity({ activityId: activity.id });
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Atividade excluída.");
    setConfirmDelete(false);
    onClose();
  }

  return (
    <>
      {/* ══ RECONHECIMENTO — header fixo ═════════════════════════════ */}
      <div className="shrink-0 border-b p-4 pr-14 sm:p-6 sm:pr-14">
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

      {/* Corpo com scroll */}
      <div className="@container/abody flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {/* ══ AÇÃO — faixa de ações ═════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-2">
          {isOpen && activity.canRegister ? (
            <Button onClick={handleRegistrar}>
              <Camera className="size-4" />
              Registrar execução
            </Button>
          ) : null}
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`/atividades/${activity.id}`} />}
          >
            <ExternalLink className="size-4" />
            Abrir página
          </Button>
          {activity.canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    aria-label="Mais ações"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 />
                  Excluir atividade
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {/* ══ DETALHE — blocos em 2 colunas quando há largura ═══════ */}
        <div className="grid gap-4 @lg/abody:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @lg/abody:items-start">
          {/* Coluna principal (Sobre + Evidências) — abarca 2 linhas */}
          <div className="order-2 flex flex-col gap-4 @lg/abody:order-none @lg/abody:col-start-1 @lg/abody:row-span-2">
            <AboutCard activity={activity} onRefresh={onRefresh} />
            <PhotosCard
              activityId={activity.id}
              photos={activity.photos}
              canManage={activity.canRegister}
              onChanged={onRefresh}
            />
          </div>

          {/* Status — primeiro no mobile, coluna lateral topo no desktop */}
          <div className="order-1 @lg/abody:order-none @lg/abody:col-start-2 @lg/abody:row-start-1">
            <StatusCard
              activityId={activity.id}
              status={activity.status}
              contextLabel={statusContextLabel(activity)}
              canChange={activity.canRegister || activity.canEdit}
              onChanged={onRefresh}
            />
          </div>

          {/* Linha do tempo — coluna lateral, abaixo do Status */}
          <div className="order-3 @lg/abody:order-none @lg/abody:col-start-2 @lg/abody:row-start-2">
            <TimelineCard activity={activity} />
          </div>
        </div>
      </div>

      {/* Confirmação de exclusão (DSM/CX) */}
      <AlertDialog
        open={confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              A atividade e suas evidências serão removidas do plano. Essa
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir atividade"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Bloco "Sobre" ────────────────────────────────────────────────────

function AboutCard({
  activity,
  onRefresh,
}: {
  activity: DrawerActivity;
  onRefresh: () => void;
}) {
  const executionEvent = activity.events.find(
    (event) =>
      event.type === "execucao_registrada" &&
      event.description &&
      event.description.trim().length > 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sobre</CardTitle>
        <CardDescription>
          Contexto da atividade dentro do plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {activity.description ? (
          <p className="text-sm leading-relaxed">{activity.description}</p>
        ) : null}

        <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
          <Field label="Local">
            {activity.branchName
              ? `${activity.branchName}${activity.branchCity ? ` — ${activity.branchCity}` : ""}`
              : "Canal geral"}
          </Field>
          <Field label="Tipo de ação">
            {activity.category ? (
              <CategoryBadge category={activity.category} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Field>

          <div className="space-y-1">
            <FieldLabel>Meta vinculada</FieldLabel>
            <div className="text-sm font-medium">
              <ProblemEditor
                activityId={activity.id}
                problemId={activity.problemId}
                problemTitle={activity.problemTitle}
                problems={activity.planProblems}
                canEdit={activity.canEdit || activity.canRegister}
                showPendency={activity.needsProblemLink}
                channelHref={activity.channelHref}
                onChanged={onRefresh}
              />
            </div>
          </div>

          <div className="space-y-1">
            <FieldLabel>Responsáveis</FieldLabel>
            {activity.assignees.length > 0 ? (
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
                <span className="text-sm font-medium leading-snug">
                  {activity.assignees.map((a) => a.name).join(", ")}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Sem responsável
              </span>
            )}
          </div>

          <Field
            label="Prazo"
            className={
              activity.overdue
                ? "font-medium text-red-600 dark:text-red-400"
                : undefined
            }
          >
            {activity.dueDate ? (
              formatDate(activity.dueDate)
            ) : (
              <span className="text-muted-foreground">Sem prazo</span>
            )}
          </Field>
          <Field label="Criada em">{formatDate(activity.createdAt, true)}</Field>
          {activity.completedAt ? (
            <Field label="Concluída em">
              {formatDate(activity.completedAt, true)}
            </Field>
          ) : null}
        </dl>

        {executionEvent ? (
          <div className="space-y-1.5 border-t pt-4">
            <FieldLabel>Descrição da execução</FieldLabel>
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
        ) : null}
      </CardContent>
    </Card>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
      {children}
    </dt>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <dd className={cn("text-sm font-medium tabular-nums", className)}>
        {children}
      </dd>
    </div>
  );
}

// ── Bloco "Linha do tempo" ───────────────────────────────────────────

function TimelineCard({ activity }: { activity: DrawerActivity }) {
  const hasCreationEvent = activity.events.some(
    (event) => event.type === "criada"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do tempo</CardTitle>
        <CardDescription>Tudo que aconteceu aqui.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
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
                  {event.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <p className="w-fit text-xs text-muted-foreground" />
                      }
                    >
                      {formatDistanceToNow(parseISO(event.createdAt), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatDate(event.createdAt, true)}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </li>
            );
          })}
          {!hasCreationEvent ? (
            <li className="relative flex gap-3">
              <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                <Plus className="size-3 text-muted-foreground" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Atividade criada</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(activity.createdAt), {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </p>
              </div>
            </li>
          ) : null}
        </ol>
      </CardContent>
    </Card>
  );
}
