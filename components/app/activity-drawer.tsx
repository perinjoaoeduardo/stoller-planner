"use client";

import * as React from "react";
import { Dialog as PanelPrimitive } from "@base-ui/react/dialog";
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
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
  X as XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ProblemEditor } from "@/app/(app)/atividades/[id]/problem-editor";
import { IconBox } from "@/components/shared/icon-box";
import { PhotoAttach } from "@/components/shared/photo-attach";
import { categoryIcon } from "@/lib/category-icons";
import { deadlineClass } from "@/lib/deadline";
import {
  ACTIVITY_STATUSES,
  STATUS_LABELS,
  StatusBadge,
  type ActivityStatus,
} from "@/components/shared/status-badge";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { CATEGORY_LABELS } from "@/lib/config";
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
            className="fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm"
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
              "fixed z-50 flex flex-col overflow-hidden bg-card text-sm text-card-foreground shadow-2xl outline-none",
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
      {/* ══ HEADER — container cinza único agrupando identidade + prazo ═ */}
      <div className="shrink-0 p-6 pt-8 md:pt-6">
        <HeaderContainer activity={activity} />
      </div>

      {/* Corpo com scroll */}
      <div className="@container/abody flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        {/* ══ AÇÃO PRIMÁRIA — Registrar alinhado à esquerda, não full ═══ */}
        {(isOpen && activity.canRegister) ||
        activity.canEdit ||
        canChangeStatus ? (
          <div className="flex items-center gap-2">
            {isOpen && activity.canRegister ? (
              <Button
                onClick={handleRegistrar}
              >
                <Camera className="size-4" />
                Registrar execução
              </Button>
            ) : null}
            {activity.canEdit || canChangeStatus ? (
              <ActionMenu
                canChangeStatus={canChangeStatus}
                canDelete={activity.canEdit}
                onChangeStatus={() => setStatusDialog(true)}
                onDelete={() => setConfirmDelete(true)}
              />
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

        {/* ══ RODAPÉ discreto — criação + autor ═════════════════════ */}
        <div className="mt-2 border-t border-border pt-4">
          <p className="text-xs tabular-nums text-muted-foreground">
            Criada em {formatDate(activity.createdAt)}
            {(() => {
              const creator =
                activity.events.find((event) => event.type === "criada")
                  ?.profileName ?? activity.responsibleName;
              return creator ? ` por ${creator}` : "";
            })()}
            {activity.completedAt
              ? ` · Concluída em ${formatDate(activity.completedAt)}`
              : ""}
          </p>
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

function ActionMenu({
  canChangeStatus,
  canDelete,
  onChangeStatus,
  onDelete,
}: {
  canChangeStatus: boolean;
  canDelete: boolean;
  onChangeStatus: () => void;
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
          <DropdownMenuItem onClick={onChangeStatus}>
            <RefreshCw />
            Alterar status
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Excluir atividade
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Header container (identidade + status/prazo integrados) ──────────
// O container cinza é o topo do painel: título, badges, canal/filial e
// uma faixa interna com contexto do status + prazo. A faixa é clicável
// pra abrir o dialog de alterar status quando o role pode mudar.

function HeaderContainer({ activity }: { activity: DrawerActivity }) {
  const headerContext = activity.branchName ?? "Canal geral";
  const TypeIcon = activity.category ? categoryIcon(activity.category) : null;
  const overdueDays =
    activity.overdue && activity.dueDate
      ? differenceInCalendarDays(new Date(), parseISO(activity.dueDate))
      : 0;

  return (
    <div className="relative rounded-xl bg-subtle p-4 dark:bg-muted/20">
      {/* Identidade agrupada — o vermelho aparece no máximo 1x (no prazo) */}
      <PanelPrimitive.Title className="pr-9 text-lg font-semibold leading-snug text-foreground line-clamp-2">
        {activity.title}
      </PanelPrimitive.Title>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={activity.status} className="px-2.5 py-0.5" />
        {activity.category && TypeIcon ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
            <TypeIcon className="size-3.5 text-foreground/70" />
            {CATEGORY_LABELS[activity.category]}
          </span>
        ) : null}
      </div>

      <PanelPrimitive.Description className="mt-3 text-sm">
        <span className="font-medium text-foreground">
          {activity.channelName}
        </span>
        <span className="text-muted-foreground"> · {headerContext}</span>
      </PanelPrimitive.Description>

      {/* Prazo compacto — sem barra dedicada de atraso */}
      <div className="mt-2 flex items-center gap-1.5 text-sm">
        <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">Prazo:</span>
        <span
          className={cn(
            "tabular-nums",
            deadlineClass(activity.dueDate, activity.status)
          )}
        >
          {activity.dueDate ? formatDate(activity.dueDate) : "Sem prazo"}
        </span>
        {overdueDays > 0 ? (
          <span className="text-xs text-destructive/80">
            (há {overdueDays} {overdueDays === 1 ? "dia" : "dias"})
          </span>
        ) : null}
      </div>

      {/* Botão X — canto superior direito do painel */}
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
  const [uploading, setUploading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<
    DrawerActivity["photos"][number] | null
  >(null);
  const [deleting, setDeleting] = React.useState(false);

  async function handleAdd(files: File[]) {
    if (files.length === 0) return;

    setUploading(true);
    try {
      let sent = 0;
      for (const file of files) {
        if (!ALLOWED_TYPES.has(file.type)) {
          toast.error("Formato não suportado. Envie JPG, PNG ou WEBP.");
          continue;
        }
        if (file.size > MAX_UPLOAD_SIZE) {
          toast.error("A foto pode ter no máximo 5MB.");
          continue;
        }
        const blob = await compressImage(file);
        const extension =
          blob.type === "image/jpeg"
            ? "jpg"
            : file.name.split(".").pop() ?? "jpg";
        const path = `${activityId}/${Date.now()}-${sent}.${extension}`;
        const supabase = createSupabaseClient();
        const { error } = await supabase.storage
          .from("activity-photos")
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (error) {
          toast.error("Falha ao enviar a foto. Tente novamente.");
          continue;
        }
        const result = await registerActivityPhoto({
          activityId,
          storagePath: path,
        });
        if (!result.ok) {
          toast.error(result.error);
          continue;
        }
        sent += 1;
      }
      if (sent > 0) {
        onChanged();
        toast.success(
          sent === 1
            ? "Foto adicionada às evidências."
            : `${sent} fotos adicionadas às evidências.`
        );
      }
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
  }

  return (
    <>
      <Card className={PANEL_CARD}>
        <CardHeader className={PANEL_CARD_HEADER}>
          <CardTitle className="text-base font-semibold">Evidências</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Fotos da execução
          </p>
        </CardHeader>
        <CardContent>
          <PhotoAttach
            photos={photos.map((photo) => ({
              id: photo.id,
              url: photoPublicUrl(photo.storagePath),
              caption: photo.caption,
              createdAt: photo.createdAt,
            }))}
            onAdd={(files) => void handleAdd(files)}
            onRemove={(id) => {
              const photo = photos.find((item) => item.id === id);
              if (photo) setConfirmDelete(photo);
            }}
            size="compact"
            busy={uploading}
            readOnly={!canManage}
          />
        </CardContent>
      </Card>

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

  const TypeIcon = activity.category ? categoryIcon(activity.category) : null;

  return (
    <Card className="gap-0 rounded-xl border-border py-6 shadow-sm [--card-spacing:--spacing(6)]">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">Sobre</CardTitle>
        <CardDescription className="mt-1">
          Detalhes e contexto da atividade
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4 flex flex-col gap-5">
        {/* Descrição — texto puro, sem label nem container (a posição explica) */}
        {activity.description ? (
          <p className="text-sm leading-relaxed text-foreground">
            {activity.description}
          </p>
        ) : null}

        {/* Local — texto puro */}
        <SobreField label="Local">
          <p className="text-sm text-foreground">
            {activity.branchName
              ? `${activity.branchName}${activity.branchCity ? ` — ${activity.branchCity}` : ""}`
              : "Canal geral"}
          </p>
        </SobreField>

        {/* Tipo de ação — chip neutro */}
        <SobreField label="Tipo de ação">
          {activity.category && TypeIcon ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-sm text-foreground">
              <TypeIcon className="size-3.5 text-foreground/70" />
              {CATEGORY_LABELS[activity.category]}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </SobreField>

        {/* Meta vinculada — ÚNICO campo com container cinza (vínculo selecionável) */}
        <SobreField label="Meta vinculada">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
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
        </SobreField>

        {/* Responsáveis — avatar de iniciais + nome */}
        <SobreField label="Responsáveis">
          {activity.assignees.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activity.assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5">
                  <Avatar size="sm">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(a.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{a.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Sem responsável
            </span>
          )}
        </SobreField>

        {executionEvent ? (
          <SobreField label="Descrição da execução">
            <p className="text-sm leading-relaxed text-foreground">
              {executionEvent.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Registrada{" "}
              {formatDistanceToNow(parseISO(executionEvent.createdAt), {
                locale: ptBR,
                addSuffix: true,
              })}
            </p>
          </SobreField>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Campo do Sobre (padrão restaurado): label text-sm font-medium SEM
 * uppercase e valor em texto limpo — cinza APENAS na Meta vinculada.
 */
function SobreField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="mt-1.5 min-w-0">{children}</div>
    </div>
  );
}

// ── Bloco "Linha do tempo" (mais recentes no topo) ────────────────────

/** Normaliza strings legadas "Problema …" para o vocabulário "Meta …". */
function normalizeEventDescription(description: string | null): string | null {
  return (
    description
      ?.replace(/Problema vinculado/g, "Meta vinculada")
      .replace(/Vínculo com problema removido/g, "Vínculo com meta removido")
      .replace(/Problema desvinculado/g, "Meta desvinculada") ?? null
  );
}

/** Título específico: o que mudou, não "Atividade editada" genérico. */
function eventTitle(event: DrawerActivity["events"][number]): {
  title: string;
  detail: string | null;
} {
  const description = normalizeEventDescription(event.description);
  if (event.type === "status_alterado" && description) {
    const match = description.match(/para "([^"]+)"/);
    if (match) {
      // O título já diz o que mudou; sem detalhe redundante.
      return { title: `Status alterado para ${match[1]}`, detail: null };
    }
  }
  if (event.type === "execucao_registrada") {
    return { title: "Execução registrada", detail: description };
  }
  return {
    title: EVENT_LABELS[event.type] ?? event.type,
    detail: description,
  };
}

function TimelineItem({
  event,
}: {
  event: DrawerActivity["events"][number];
}) {
  const { title, detail } = eventTitle(event);
  const isConclusion =
    event.type === "status_alterado" &&
    event.description?.includes('para "Concluída"');
  const when = formatDistanceToNow(parseISO(event.createdAt), {
    locale: ptBR,
    addSuffix: true,
  });

  return (
    <li className="relative flex gap-3">
      <IconBox
        icon={eventIcon(event.type, event.description)}
        size="sm"
        className={cn(
          "z-10 rounded-full",
          isConclusion && "bg-success-bg"
        )}
        iconClassName={cn(isConclusion && "text-success")}
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {detail ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <p className="line-clamp-1 text-sm text-muted-foreground" />
              }
            >
              {detail}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{detail}</TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger
            render={<p className="w-fit text-xs text-muted-foreground" />}
          >
            {event.profileName ? `${event.profileName} · ${when}` : when}
          </TooltipTrigger>
          <TooltipContent>
            {formatDate(event.createdAt, true)}
          </TooltipContent>
        </Tooltip>
      </div>
    </li>
  );
}

const TIMELINE_COLLAPSED = 5;

function TimelineCard({ activity }: { activity: DrawerActivity }) {
  const [showAll, setShowAll] = React.useState(false);
  const hasCreationEvent = activity.events.some(
    (event) => event.type === "criada"
  );
  // Mais recentes primeiro — a fallback de criação (se faltar o evento)
  // é a mais antiga, então continua por último.
  const events = [...activity.events].reverse();
  const visible = showAll ? events : events.slice(0, TIMELINE_COLLAPSED);
  const hidden = events.length - visible.length;

  return (
    <Card className={PANEL_CARD}>
      <CardHeader className={PANEL_CARD_HEADER}>
        <CardTitle className="text-base font-semibold">
          Linha do tempo
        </CardTitle>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Histórico da atividade
        </p>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-border">
          {visible.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
          {!hasCreationEvent && (showAll || hidden === 0) ? (
            <li className="relative flex gap-3">
              <IconBox icon={Plus} size="sm" className="z-10 rounded-full" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Atividade criada
                </p>
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
        {hidden > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-sm text-muted-foreground"
            onClick={() => setShowAll(true)}
          >
            Ver histórico completo ({events.length})
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
