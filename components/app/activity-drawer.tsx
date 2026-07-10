"use client";

import * as React from "react";
import { Dialog as PanelPrimitive } from "@base-ui/react/dialog";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
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
          {/*
            Painel flutuante:
            - Mobile (<768px): drawer de baixo, ~92vh, cantos superiores
              arredondados, handle no topo, desliza em Y.
            - Tablet (768-1023px): flutua à direita, ~70vw, desliza em X.
            - Desktop (≥1024px): flutua à direita, 50vw fixo (min 640,
              max 860), desliza em X.
          */}
          <PanelPrimitive.Popup
            data-slot="activity-panel"
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden bg-card text-sm text-card-foreground shadow-2xl",
              "transition-[transform,opacity] duration-300 ease-out",
              // Mobile — drawer de baixo (top/right/bottom/left em longhand
              // pra não brigar em cascata com os overrides do md: abaixo)
              "top-[8vh] right-0 bottom-0 left-0 w-full rounded-t-2xl rounded-b-none border-t",
              "data-starting-style:translate-y-full data-ending-style:translate-y-full",
              // Tablet/desktop — flutua à direita
              "md:top-4 md:right-4 md:bottom-4 md:left-auto md:w-[70vw] md:rounded-2xl md:border",
              "md:data-starting-style:translate-y-0 md:data-ending-style:translate-y-0",
              "md:data-starting-style:translate-x-[calc(100%+1.5rem)] md:data-ending-style:translate-x-[calc(100%+1.5rem)]",
              "lg:w-[50vw] lg:min-w-[640px] lg:max-w-[860px]"
            )}
          >
            {/* Handle do drawer mobile */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-2 flex justify-center md:hidden"
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {loading ? (
              <DrawerSkeleton />
            ) : activity ? (
              <DrawerBody
                activity={activity}
                onRefresh={refresh}
                onClose={close}
              />
            ) : (
              <div className="flex flex-col gap-1.5 p-6 pt-7 pr-14">
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
      <div className="shrink-0 border-b p-4 pt-7 pr-14 md:p-6 md:pr-14">
        <PanelPrimitive.Title className="sr-only">
          Carregando atividade
        </PanelPrimitive.Title>
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      {/* Corpo skeleton */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        <div className="h-11 w-56 animate-pulse rounded-lg bg-muted" />
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

function scrollToRef(ref: React.RefObject<HTMLDivElement | null>) {
  ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const statusRef = React.useRef<HTMLDivElement>(null);
  const metaRef = React.useRef<HTMLDivElement>(null);

  const isOpen =
    activity.status === "planejada" ||
    activity.status === "em_andamento" ||
    activity.status === "atrasada";

  const canChangeStatus = activity.canRegister || activity.canEdit;
  const canLinkMeta = activity.canRegister || activity.canEdit;
  const showMenu = canChangeStatus || canLinkMeta || activity.canEdit;

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
      <div className="shrink-0 border-b p-4 pt-7 pr-14 md:p-6 md:pr-14">
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
      <div className="@container/abody flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        {/* ══ AÇÃO PRIMÁRIA — destaque máximo ═══════════════════════ */}
        {isOpen && activity.canRegister ? (
          <div className="flex items-center gap-2">
            <Button size="lg" className="flex-1" onClick={handleRegistrar}>
              <Camera className="size-5" />
              Registrar execução
            </Button>
            {showMenu ? (
              <ActionMenu
                canEdit={activity.canEdit}
                canChangeStatus={canChangeStatus}
                canLinkMeta={canLinkMeta}
                onStatus={() => scrollToRef(statusRef)}
                onMeta={() => scrollToRef(metaRef)}
                onDelete={() => setConfirmDelete(true)}
              />
            ) : null}
          </div>
        ) : showMenu ? (
          <div className="flex items-center justify-end">
            <ActionMenu
              canEdit={activity.canEdit}
              canChangeStatus={canChangeStatus}
              canLinkMeta={canLinkMeta}
              onStatus={() => scrollToRef(statusRef)}
              onMeta={() => scrollToRef(metaRef)}
              onDelete={() => setConfirmDelete(true)}
            />
          </div>
        ) : null}

        {/* ══ DETALHE — 2 colunas quando há largura ═════════════════ */}
        <div className="grid gap-4 @xl/abody:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @xl/abody:items-start">
          {/* Coluna A — Situação + Sobre */}
          <div className="flex flex-col gap-4">
            <div ref={statusRef}>
              <SituacaoCard
                activity={activity}
                canChange={canChangeStatus}
                onRefresh={onRefresh}
              />
            </div>
            <SobreCard
              activity={activity}
              onRefresh={onRefresh}
              metaRef={metaRef}
              canLinkMeta={canLinkMeta}
            />
          </div>

          {/* Coluna B — Evidências + Linha do tempo */}
          <div className="flex flex-col gap-4">
            <PhotosCard
              activityId={activity.id}
              photos={activity.photos}
              canManage={activity.canRegister}
              onChanged={onRefresh}
            />
            <TimelineCard activity={activity} />
          </div>
        </div>

        {/* ══ RODAPÉ discreto — datas de referência ═════════════════ */}
        <Separator />
        <p className="text-xs text-muted-foreground tabular-nums">
          Criada em {formatDate(activity.createdAt, true)}
          {activity.completedAt
            ? ` · Concluída em ${formatDate(activity.completedAt, true)}`
            : ""}
        </p>
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

// ── Menu de ações secundárias ────────────────────────────────────────

function ActionMenu({
  canEdit,
  canChangeStatus,
  canLinkMeta,
  onStatus,
  onMeta,
  onDelete,
}: {
  canEdit: boolean;
  canChangeStatus: boolean;
  canLinkMeta: boolean;
  onStatus: () => void;
  onMeta: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Mais ações" />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canChangeStatus ? (
          <DropdownMenuItem onClick={onStatus}>
            <RefreshCw />
            Mudar status
          </DropdownMenuItem>
        ) : null}
        {canLinkMeta ? (
          <DropdownMenuItem onClick={onMeta}>
            <Link2 />
            Vincular meta
          </DropdownMenuItem>
        ) : null}
        {canEdit ? (
          <>
            {canChangeStatus || canLinkMeta ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Excluir atividade
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Bloco "Situação" (StatusCard + prazo em destaque) ────────────────

function SituacaoCard({
  activity,
  canChange,
  onRefresh,
}: {
  activity: DrawerActivity;
  canChange: boolean;
  onRefresh: () => void;
}) {
  return (
    <StatusCard
      title="Situação"
      activityId={activity.id}
      status={activity.status}
      contextLabel={statusContextLabel(activity)}
      canChange={canChange}
      onChanged={onRefresh}
      extra={
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prazo
          </span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              activity.overdue && "text-red-600 dark:text-red-400"
            )}
          >
            {activity.dueDate ? (
              formatDate(activity.dueDate)
            ) : (
              <span className="font-normal text-muted-foreground">
                Sem prazo
              </span>
            )}
          </span>
        </div>
      }
    />
  );
}

// ── Bloco "Sobre" (subgrupos: o que / onde-o quê / vínculos) ─────────

function SobreCard({
  activity,
  onRefresh,
  metaRef,
  canLinkMeta,
}: {
  activity: DrawerActivity;
  onRefresh: () => void;
  metaRef: React.RefObject<HTMLDivElement | null>;
  canLinkMeta: boolean;
}) {
  const executionEvent = activity.events.find(
    (event) =>
      event.type === "execucao_registrada" &&
      event.description &&
      event.description.trim().length > 0
  );

  return (
    <Card className="@container/sobre">
      <CardHeader>
        <CardTitle>Sobre</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Subgrupo 1 — o que é (peso maior) */}
        {activity.description ? (
          <p className="text-sm leading-relaxed">{activity.description}</p>
        ) : null}

        {/* Subgrupo 2 — onde e o quê */}
        <div className="grid grid-cols-1 gap-4 @[440px]/sobre:grid-cols-2">
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
        </div>

        {/* Subgrupo 3 — vínculos (a que/a quem se conecta) */}
        <div
          ref={metaRef}
          className="grid grid-cols-1 gap-4 border-t pt-4 @[440px]/sobre:grid-cols-2"
        >
          <div className="min-w-0 space-y-1">
            <FieldLabel>Meta vinculada</FieldLabel>
            <div className="text-sm font-medium">
              <ProblemEditor
                activityId={activity.id}
                problemId={activity.problemId}
                problemTitle={activity.problemTitle}
                problems={activity.planProblems}
                canEdit={canLinkMeta}
                showPendency={activity.needsProblemLink}
                channelHref={activity.channelHref}
                onChanged={onRefresh}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-1">
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
        </div>

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

// ── Bloco "Linha do tempo" (mais recentes no topo) ────────────────────

function TimelineCard({ activity }: { activity: DrawerActivity }) {
  const hasCreationEvent = activity.events.some(
    (event) => event.type === "criada"
  );
  // Mais recentes primeiro — a fallback de criação (se faltar o evento)
  // é a mais antiga, então continua por último.
  const events = [...activity.events].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
          {events.map((event) => {
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
