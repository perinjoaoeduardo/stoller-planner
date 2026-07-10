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
  ImagePlus,
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

import { ProblemEditor } from "@/app/(app)/atividades/[id]/problem-editor";
import { CategoryBadge } from "@/components/app/category-badge";
import {
  ACTIVITY_STATUSES,
  STATUS_LABELS,
  StatusBadge,
  type ActivityStatus,
} from "@/components/app/status-badge";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getDrawerActivity,
  type DrawerActivity,
} from "@/lib/actions/activity-drawer";
import {
  changeActivityStatus,
  deleteActivity,
  deleteActivityPhoto,
  registerActivityPhoto,
} from "@/lib/actions/plan";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Ritmo compartilhado entre os cards do painel (FIX 11): padding de 20px
// (p-5) e cabeçalho com respiro fixo antes do conteúdo. Aplicar em todos
// os blocos — Situação, Sobre, Evidências, Linha do tempo.
const PANEL_CARD = "[--card-spacing:--spacing(5)]";
const PANEL_CARD_HEADER = "pb-4";

/** Reduz a imagem no client (máx. 1600px, JPEG q0.8) antes do upload —
 *  espelha o pipeline usado no PhotosCard da tela cheia. */
async function compressImage(file: File): Promise<Blob> {
  if (file.size < 400 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.8);
  });
}

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
              <div className="relative flex flex-col gap-1.5 p-6 pt-7 pr-14">
                <PanelPrimitive.Title className="text-xl font-semibold">
                  Atividade não encontrada
                </PanelPrimitive.Title>
                <PanelPrimitive.Description className="text-sm text-muted-foreground">
                  Esta atividade não existe ou está fora do seu escopo.
                </PanelPrimitive.Description>
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
              </div>
            )}
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
      {/* Header skeleton (container cinza, mesmo layout do body) */}
      <div className="shrink-0 p-4 pt-8 md:p-4 md:pt-6">
        <div className="relative rounded-xl bg-muted/30 p-5 dark:bg-muted/20">
          <PanelPrimitive.Title className="sr-only">
            Carregando atividade
          </PanelPrimitive.Title>
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-10 w-full animate-pulse rounded-lg bg-muted/60" />
          <PanelPrimitive.Close
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-3 rounded-full bg-secondary"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Fechar</span>
          </PanelPrimitive.Close>
        </div>
      </div>
      {/* Corpo skeleton */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 md:px-4 md:pb-4">
        <div className="h-11 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-52 w-full animate-pulse rounded-lg bg-muted" />
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

/** Ícone semântico do evento — usa createElement pra evitar o
 *  `const Icon = ...` que o React Compiler flaga como componente
 *  criado em render. */
function EventIcon({
  type,
  description,
  className,
}: {
  type: string;
  description: string | null;
  className?: string;
}) {
  return React.createElement(eventIcon(type, description), { className });
}

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
  const [statusDialog, setStatusDialog] = React.useState(false);

  const isOpen =
    activity.status === "planejada" ||
    activity.status === "em_andamento" ||
    activity.status === "atrasada";

  const canChangeStatus = activity.canRegister || activity.canEdit;
  const canLinkMeta = activity.canRegister || activity.canEdit;

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
      {/* ══ HEADER — container cinza único agrupando identidade + status ═ */}
      <div className="shrink-0 p-4 pt-8 md:p-4 md:pt-6">
        <HeaderContainer
          activity={activity}
          canChangeStatus={canChangeStatus}
          onOpenStatusDialog={() => setStatusDialog(true)}
        />
      </div>

      {/* Corpo com scroll */}
      <div className="@container/abody flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 md:px-4 md:pb-4">
        {/* ══ AÇÃO PRIMÁRIA — Registrar alinhado à esquerda, não full ═══ */}
        {(isOpen && activity.canRegister) || activity.canEdit ? (
          <div className="flex items-center gap-2">
            {isOpen && activity.canRegister ? (
              <Button size="lg" onClick={handleRegistrar}>
                <Camera className="size-5" />
                Registrar execução
              </Button>
            ) : null}
            {activity.canEdit ? (
              <ActionMenu onDelete={() => setConfirmDelete(true)} />
            ) : null}
          </div>
        ) : null}

        {/* ══ DETALHE — 2 colunas quando há largura ══════════════════ */}
        <div className="grid gap-4 @xl/abody:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @xl/abody:items-start">
          {/* Coluna A — Sobre */}
          <SobreCard
            activity={activity}
            onRefresh={onRefresh}
            canLinkMeta={canLinkMeta}
          />

          {/* Coluna B — Evidências + Linha do tempo */}
          <div className="flex flex-col gap-4">
            <EvidencesBlock
              activityId={activity.id}
              photos={activity.photos}
              canManage={activity.canRegister}
              onChanged={onRefresh}
            />
            <TimelineCard activity={activity} />
          </div>
        </div>

        {/* ══ RODAPÉ discreto — datas de referência ═════════════════ */}
        <div className="mt-2 border-t border-border/50 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
            <span>Criada em {formatDate(activity.createdAt, true)}</span>
            {activity.completedAt ? (
              <span>
                Concluída em {formatDate(activity.completedAt, true)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Alterar status manualmente (via menu "...", ação secundária) */}
      <StatusChangeDialog
        open={statusDialog}
        onOpenChange={setStatusDialog}
        activityId={activity.id}
        currentStatus={activity.status}
        onChanged={onRefresh}
      />

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

// ── Dialog "Alterar status" (ação secundária, fora do caminho) ────────

function StatusChangeDialog({
  open,
  onOpenChange,
  activityId,
  currentStatus,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activityId: string;
  currentStatus: ActivityStatus;
  onChanged: () => void;
}) {
  const [selected, setSelected] = React.useState<ActivityStatus>(currentStatus);
  const [pending, startTransition] = React.useTransition();

  // Sincroniza o Select com a atividade atual sempre que o dialog abre —
  // como estamos dentro de um dialog controlado, é seguro fazer no render
  // guardando a versão anterior de `open`.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(currentStatus);
  }

  function handleConfirm() {
    const next = selected;
    startTransition(async () => {
      const result = await changeActivityStatus({ activityId, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChanged();
      onOpenChange(false);
      if (next === "concluida") {
        toast.success("Atividade concluída.");
      } else if (currentStatus === "concluida") {
        toast.success("Atividade reaberta.");
      } else {
        toast.success(`Status alterado para "${STATUS_LABELS[next]}".`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar status</DialogTitle>
          <DialogDescription>
            Mudança manual — só quando &ldquo;Registrar execução&rdquo; não é o caminho.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Select
            value={selected}
            onValueChange={(value) => setSelected(value as ActivityStatus)}
            items={ACTIVITY_STATUSES.map((item) => ({
              value: item,
              label: STATUS_LABELS[item],
            }))}
          >
            <SelectTrigger className="w-full" aria-label="Novo status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {STATUS_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={pending}>
                Cancelar
              </Button>
            }
          />
          <Button
            onClick={handleConfirm}
            disabled={pending || selected === currentStatus}
          >
            {pending ? (
              <>
                <Spinner />
                Salvando...
              </>
            ) : (
              "Confirmar mudança"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Menu de ações secundárias (só DSM/CX — Excluir) ──────────────────

function ActionMenu({ onDelete }: { onDelete: () => void }) {
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
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Excluir atividade
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Header container (identidade + status/prazo integrados) ──────────
// O container cinza é o topo do painel: título, badges, canal/filial e
// uma faixa interna com contexto do status + prazo. A faixa é clicável
// pra abrir o dialog de alterar status quando o role pode mudar.

function HeaderContainer({
  activity,
  canChangeStatus,
  onOpenStatusDialog,
}: {
  activity: DrawerActivity;
  canChangeStatus: boolean;
  onOpenStatusDialog: () => void;
}) {
  const contextLabel = statusContextLabel(activity);
  const headerContext =
    activity.branchName ?? "Canal geral";

  return (
    <div className="relative rounded-xl bg-muted/30 p-5 dark:bg-muted/20">
      {/* Linha 1 — Identidade */}
      <PanelPrimitive.Title className="pr-9 text-xl font-semibold leading-snug line-clamp-2">
        {activity.title}
      </PanelPrimitive.Title>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={activity.status} className="px-2.5 py-0.5" />
        {activity.category && (
          <CategoryBadge category={activity.category} />
        )}
      </div>

      {/* Linha 2 — Contexto: canal em destaque, filial secundária */}
      <PanelPrimitive.Description className="mt-3 text-sm">
        <span className="font-medium text-foreground">
          {activity.channelName}
        </span>
        <span className="text-muted-foreground"> · {headerContext}</span>
      </PanelPrimitive.Description>

      {/* Linha 3 — Status + Prazo integrados (clicável quando pode alterar) */}
      <div
        className={cn(
          "mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 px-4 py-3 dark:bg-muted/40",
          canChangeStatus &&
            "group/status cursor-pointer transition-colors hover:bg-muted/70 dark:hover:bg-muted/60"
        )}
        onClick={canChangeStatus ? onOpenStatusDialog : undefined}
        role={canChangeStatus ? "button" : undefined}
        tabIndex={canChangeStatus ? 0 : undefined}
        onKeyDown={
          canChangeStatus
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenStatusDialog();
                }
              }
            : undefined
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          {contextLabel ? (
            <p
              className={cn(
                "text-sm",
                activity.status === "atrasada"
                  ? "font-medium text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              {contextLabel}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {STATUS_LABELS[activity.status]}
            </p>
          )}
          {canChangeStatus ? (
            <Pencil
              aria-hidden
              className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/status:opacity-100"
            />
          ) : null}
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prazo
          </span>
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
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
      </div>

      {/* Botão X — canto superior direito do container cinza */}
      <PanelPrimitive.Close
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-3 top-3 rounded-full bg-secondary"
          />
        }
      >
        <XIcon />
        <span className="sr-only">Fechar</span>
      </PanelPrimitive.Close>
    </div>
  );
}

// ── Bloco Evidências (unificado — vazio ou com grid) ─────────────────
// Substitui o PhotosCard da tela cheia dentro do painel. Faz upload
// local com o mesmo pipeline (compressImage → storage → server action).
// Lightbox em Dialog, exclusão em AlertDialog. Botão nunca vaza do card.

function EvidencesBlock({
  activityId,
  photos,
  canManage,
  onChanged,
}: {
  activityId: string;
  photos: DrawerActivity["photos"];
  canManage: boolean;
  onChanged: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState<DrawerActivity["photos"][number] | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<
    DrawerActivity["photos"][number] | null
  >(null);
  const [deleting, setDeleting] = React.useState(false);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Formato não suportado. Envie JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      toast.error("A foto pode ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    try {
      const blob = await compressImage(file);
      const extension =
        blob.type === "image/jpeg" ? "jpg" : file.name.split(".").pop() ?? "jpg";
      const path = `${activityId}/${Date.now()}.${extension}`;
      const supabase = createSupabaseClient();
      const { error } = await supabase.storage
        .from("activity-photos")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) {
        toast.error("Falha ao enviar a foto. Tente novamente.");
        return;
      }
      const result = await registerActivityPhoto({ activityId, storagePath: path });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChanged();
      toast.success("Foto adicionada às evidências.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    const result = await deleteActivityPhoto({ photoId: confirmDelete.id });
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChanged();
    toast.success("Foto removida.");
    setConfirmDelete(null);
    setPreview(null);
  }

  const isEmpty = photos.length === 0;
  const addButtonLabel = uploading ? "Enviando…" : "Adicionar foto";

  return (
    <>
      <Card className={PANEL_CARD}>
        <CardHeader
          className={cn(
            PANEL_CARD_HEADER,
            "flex flex-row items-start justify-between gap-2"
          )}
        >
          <div className="min-w-0">
            <CardTitle>Evidências</CardTitle>
            {isEmpty ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Fotos da execução
              </p>
            ) : null}
          </div>
          {canManage && !isEmpty ? (
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="shrink-0"
            >
              {uploading ? <Spinner /> : <ImagePlus className="size-3.5" />}
              <span className="hidden @[380px]/abody:inline">
                {addButtonLabel}
              </span>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {canManage ? (
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
          ) : null}

          {isEmpty ? (
            // Vazio: bloco compacto centralizado com respiro (≈180px)
            <div className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-md bg-muted/20 py-6 text-center dark:bg-muted/30">
              <Camera className="size-6 text-muted-foreground/70" />
              <p className="text-sm text-muted-foreground">Nenhuma foto ainda</p>
              {canManage ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="mt-1"
                >
                  {uploading ? (
                    <>
                      <Spinner />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Camera className="size-3.5" />
                      Adicionar foto
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          ) : (
            // Com fotos: grid 3 col
            <div className="grid grid-cols-3 gap-3">
              {photos.slice(0, 6).map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setPreview(photo)}
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                  aria-label={photo.caption ?? "Ampliar evidência"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPublicUrl(photo.storagePath)}
                    alt={photo.caption ?? "Evidência da atividade"}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </button>
              ))}
              {photos.length > 6 ? (
                <button
                  type="button"
                  onClick={() => setPreview(photos[6])}
                  className="flex aspect-square items-center justify-center rounded-md border bg-muted/40 text-xs font-medium text-muted-foreground hover:bg-muted/70"
                >
                  +{photos.length - 6}
                </button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evidência</DialogTitle>
            <DialogDescription>
              {preview?.caption ??
                (preview
                  ? `Adicionada em ${format(
                      parseISO(preview.createdAt),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    )}`
                  : "")}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photoPublicUrl(preview.storagePath)}
              alt={preview.caption ?? "Evidência da atividade"}
              className="max-h-[70dvh] w-full rounded-md object-contain"
            />
          ) : null}
          {canManage && preview ? (
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(preview)}
              >
                <Trash2 />
                Excluir foto
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
            <AlertDialogDescription>
              A foto será removida das evidências. Essa ação não pode ser
              desfeita.
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
              {deleting ? "Excluindo…" : "Excluir foto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** URL pública do bucket activity-photos (o bucket é público). */
function photoPublicUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activity-photos/${storagePath}`;
}

// ── Bloco "Sobre" (subgrupos: o que / onde-o quê / vínculos) ─────────

function SobreCard({
  activity,
  onRefresh,
  canLinkMeta,
}: {
  activity: DrawerActivity;
  onRefresh: () => void;
  canLinkMeta: boolean;
}) {
  const executionEvent = activity.events.find(
    (event) =>
      event.type === "execucao_registrada" &&
      event.description &&
      event.description.trim().length > 0
  );

  return (
    <Card className={cn(PANEL_CARD, "@container/sobre")}>
      <CardHeader className={PANEL_CARD_HEADER}>
        <CardTitle>Sobre</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        {/* Subgrupo 1 — Descrição (o que é pra fazer, peso maior) */}
        {activity.description ? (
          <p className="mb-6 text-sm leading-relaxed">{activity.description}</p>
        ) : null}

        {/* Subgrupo 2 — Contexto (onde e o quê) */}
        <div className="mb-6 grid grid-cols-1 gap-4 @[440px]/sobre:grid-cols-2">
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

        {/* Subgrupo 3 — Vínculos (a quem/a que se conecta): fundo cinza
            sutil pra agrupar visualmente essa "família" de campos */}
        <div className="grid grid-cols-1 gap-4 rounded-md bg-muted/30 p-3 dark:bg-muted/20 @[440px]/sobre:grid-cols-2">
          <div className="min-w-0">
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

          <div className="min-w-0">
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
          <div className="mt-6">
            <FieldLabel>Descrição da execução</FieldLabel>
            <p className="text-sm leading-relaxed">
              {executionEvent.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
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
    <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <dd className={cn("text-sm font-medium tabular-nums", className)}>
        {children}
      </dd>
    </div>
  );
}

// ── Bloco "Linha do tempo" (mais recentes no topo) ────────────────────

function TimelineItem({
  event,
}: {
  event: DrawerActivity["events"][number];
}) {
  const [expanded, setExpanded] = React.useState(false);
  // Renomeia string legada "Problema vinculado/removido" pra "Meta …"
  const description = event.description
    ?.replace(/Problema vinculado/g, "Meta vinculada")
    .replace(/Vínculo com problema removido/g, "Vínculo com meta removido")
    .replace(/Problema desvinculado/g, "Meta desvinculada");
  const long = description && description.length > 140;

  return (
    <li className="relative flex gap-3">
      <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
        <EventIcon
          type={event.type}
          description={event.description}
          className="size-3 text-muted-foreground"
        />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">
          {EVENT_LABELS[event.type] ?? event.type}
        </p>
        {description ? (
          <>
            <p
              className={cn(
                "text-xs text-muted-foreground",
                !expanded && "line-clamp-3"
              )}
            >
              {description}
            </p>
            {long ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-medium text-foreground hover:underline"
              >
                {expanded ? "ver menos" : "ver mais"}
              </button>
            ) : null}
          </>
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
}

function TimelineCard({ activity }: { activity: DrawerActivity }) {
  const hasCreationEvent = activity.events.some(
    (event) => event.type === "criada"
  );
  // Mais recentes primeiro — a fallback de criação (se faltar o evento)
  // é a mais antiga, então continua por último.
  const events = [...activity.events].reverse();

  return (
    <Card className={PANEL_CARD}>
      <CardHeader className={PANEL_CARD_HEADER}>
        <CardTitle>Linha do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
          {events.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
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
