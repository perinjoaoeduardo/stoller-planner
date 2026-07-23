"use client";

import * as React from "react";
import { Dialog as PanelPrimitive } from "@base-ui/react/dialog";
import {
  differenceInCalendarDays,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Camera,
  Check,
  ChevronDown,
  Plus,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ProblemEditor } from "@/app/(app)/atividades/[id]/problem-editor";
import { IconBox } from "@/components/shared/icon-box";
import { PhotoAttach } from "@/components/shared/photo-attach";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import {
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EVENT_LABELS, eventIcon } from "@/lib/activity-events";
import { formatDate } from "@/lib/plan-utils";
import {
  changeActivityStatus,
  deleteActivityPhoto,
  registerActivityPhoto,
} from "@/lib/actions/plan";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_SIZE,
  compressImage,
  photoStoragePath,
  publicPhotoUrl,
} from "@/lib/photos";
import { CATEGORY_LABELS } from "@/lib/config";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { cn, getInitials } from "@/lib/utils";

// Ritmo compartilhado entre os cards do painel (FIX 11): padding de 20px
// (p-5) e cabeçalho com respiro fixo antes do conteúdo. Aplicar em todos
// os blocos — Situação, Sobre, Evidências, Linha do tempo.
const PANEL_CARD = "[--card-spacing:--spacing(5)]";
const PANEL_CARD_HEADER = "pb-4";

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
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="mt-2 h-5 w-40 rounded" />
          <Skeleton className="mt-3 h-4 w-1/2 rounded" />
          <Skeleton className="mt-3 h-10 w-full rounded-lg" />
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
        <Skeleton className="h-11 w-56 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-52 w-full rounded-lg" />
      </div>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────


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

  const isOpen =
    activity.status === "planejada" || activity.status === "atrasada";

  // Execução já registrada? Então o CTA "Registrar execução" some — não
  // faz sentido registrar de novo (o relato vive na linha do tempo).
  const hasExecution = activity.events.some(
    (event) => event.type === "execucao_registrada"
  );

  // Cancelada é atividade ENCERRADA: nada de anexar foto ou editar meta
  // — só a mudança de status fica viva (pra poder reabrir).
  const isCancelled = activity.status === "nao_feita";

  const canChangeStatus = activity.canRegister || activity.canEdit;
  const canLinkMeta = (activity.canRegister || activity.canEdit) && !isCancelled;

  function handleRegistrar() {
    onClose();
    openWizard({
      mode: "registrar",
      activityId: activity.id,
      channelId: activity.channelId,
    });
  }

  const creatorName =
    activity.events.find((event) => event.type === "criada")?.profileName ??
    activity.responsibleName;

  return (
    <>
      {/* ══ HEADER — container cinza único agrupando identidade + prazo ═ */}
      <div className="shrink-0 p-6 pt-8 md:pt-6">
        <HeaderContainer
          activity={activity}
          canChangeStatus={canChangeStatus}
          onChanged={onRefresh}
        />
      </div>

      {/* Corpo com scroll */}
      <div className="@container/abody flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        {/* ══ DETALHE — 2 colunas quando há largura ══════════════════ */}
        <div className="grid gap-4 @xl/abody:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @xl/abody:items-start">
          {/* Coluna A — Sobre */}
          <SobreCard
            activity={activity}
            onRefresh={onRefresh}
            canLinkMeta={canLinkMeta}
          />

          {/* Coluna B — Evidências + Linha do tempo. Numa aberta sem
              execução, o próprio bloco de Evidências é o CTA de
              registrar — sem botão primário solto no painel. */}
          <div className="flex flex-col gap-4">
            <EvidencesBlock
              activityId={activity.id}
              photos={activity.photos}
              canManage={activity.canRegister && !isCancelled}
              onChanged={onRefresh}
              onRegister={
                isOpen && activity.canRegister && !hasExecution
                  ? handleRegistrar
                  : undefined
              }
            />
            <TimelineCard activity={activity} />
          </div>
        </div>
      </div>

      {/* ══ RODAPÉ sticky — criação + autor, sempre no bottom ══════════ */}
      <div className="shrink-0 border-t border-border bg-card px-6 py-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          Criada em {formatDate(activity.createdAt)}
          {creatorName ? ` por ${creatorName}` : ""}
          {activity.completedAt
            ? ` · Concluída em ${formatDate(activity.completedAt)}`
            : ""}
        </p>
      </div>

    </>
  );
}

// ── Seletor de status inline ─────────────────────────────────────────
// Substitui o antigo dialog "Alterar status" (badge escondido → dialog →
// select → confirmar), que tinha zero affordance. O status vira um
// controle óbvio de select: pill com borda + chevron, clique abre o menu,
// a escolha aplica na hora (toast). Não há "excluir" — cancelar é o
// status "Cancelada"; tudo fica gravado.

// Atrasada é derivada (planejada + prazo vencido), não se define à mão.
const MANUAL_STATUSES: ActivityStatus[] = [
  "planejada",
  "concluida",
  "nao_feita",
];

/** Qual opção manual representa o status atual (atrasada = planejada). */
function manualKey(status: ActivityStatus): ActivityStatus {
  if (status === "concluida") return "concluida";
  if (status === "nao_feita") return "nao_feita";
  return "planejada";
}

function StatusSelect({
  activityId,
  currentStatus,
  onChanged,
}: {
  activityId: string;
  currentStatus: ActivityStatus;
  onChanged: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const current = manualKey(currentStatus);

  function apply(next: ActivityStatus) {
    if (next === current || pending) return;
    startTransition(async () => {
      const result = await changeActivityStatus({ activityId, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChanged();
      if (next === "concluida") toast.success("Atividade concluída.");
      else if (next === "nao_feita") toast.success("Atividade cancelada.");
      else if (current === "concluida" || current === "nao_feita")
        toast.success("Atividade reaberta.");
      else toast.success(`Status alterado para "${STATUS_LABELS[next]}".`);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={pending}
            aria-label="Alterar status"
            className="group inline-flex cursor-pointer items-center gap-1 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
          />
        }
      >
        <StatusBadge
          status={currentStatus}
          className="px-3 py-1 text-sm"
        />
        {pending ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {MANUAL_STATUSES.map((status) => (
          <DropdownMenuItem key={status} onClick={() => apply(status)}>
            {STATUS_LABELS[status]}
            {status === current ? (
              <Check className="ml-auto size-4 text-muted-foreground" />
            ) : null}
          </DropdownMenuItem>
        ))}
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
  onChanged,
}: {
  activity: DrawerActivity;
  canChangeStatus: boolean;
  onChanged: () => void;
}) {
  const headerContext = activity.branchName ?? "Canal geral";
  const dueDate = activity.dueDate;
  const completedAt = activity.completedAt;
  const isOverdue =
    activity.overdue && activity.status === "atrasada" && !!dueDate;

  // "Mensagem" do rodapé do header (strip separado): conclusão, atraso ou
  // vencimento. Só aparece quando há algo a dizer.
  let message: string | null = null;
  if (completedAt) {
    message = `Concluída em ${formatDate(completedAt)}`;
  } else if (isOverdue && dueDate) {
    message = `Atrasada desde ${formatDate(dueDate)}`;
  } else if (dueDate) {
    const days = differenceInCalendarDays(parseISO(dueDate), new Date());
    message =
      days === 0
        ? "Vence hoje"
        : days === 1
          ? "Vence amanhã"
          : days > 1
            ? `Vence em ${days} dias`
            : null;
  }
  const showStrip = !!(dueDate || completedAt);

  return (
    <div className="flex flex-col gap-2">
      {/* Card de identidade */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        {/* Linha 1 — só o status à esquerda, fechar à direita */}
        <div className="flex items-start justify-between gap-2">
          {canChangeStatus ? (
            <StatusSelect
              activityId={activity.id}
              currentStatus={activity.status}
              onChanged={onChanged}
            />
          ) : (
            <StatusBadge
              status={activity.status}
              className="px-3 py-1 text-sm"
            />
          )}
          <PanelPrimitive.Close
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 rounded-full bg-secondary"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Fechar</span>
          </PanelPrimitive.Close>
        </div>

        {/* Título */}
        <PanelPrimitive.Title className="mt-2 text-lg font-semibold leading-snug text-foreground">
          {activity.title}
        </PanelPrimitive.Title>

        {/* Canal · Filial (o tipo de ação já vive no card Sobre) */}
        <PanelPrimitive.Description className="mt-1 text-sm">
          <span className="font-medium text-foreground">
            {activity.channelName}
          </span>
          <span className="text-muted-foreground"> · {headerContext}</span>
        </PanelPrimitive.Description>
      </div>

      {/* Bloco separado — mensagem de conclusão/atraso/vencimento + PRAZO */}
      {showStrip ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-subtle px-4 py-3 text-sm">
          <span
            className={cn(
              "tabular-nums",
              isOverdue ? "font-medium text-destructive" : "text-muted-foreground"
            )}
          >
            {message}
          </span>
          {dueDate ? (
            <span className="tabular-nums">
              <span className="text-xs font-medium text-muted-foreground">
                Prazo{"  "}
              </span>
              <span
                className={cn(
                  "font-medium",
                  isOverdue ? "text-destructive" : "text-foreground"
                )}
              >
                {formatDate(dueDate)}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
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
  onRegister,
}: {
  activityId: string;
  photos: DrawerActivity["photos"];
  canManage: boolean;
  onChanged: () => void;
  /** Aberta sem execução: o bloco vira o CTA de registrar (abre o
   *  wizard) em vez do anexar-foto avulso. */
  onRegister?: () => void;
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
        if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
          toast.error("Formato não suportado. Envie JPG, PNG ou WEBP.");
          continue;
        }
        if (file.size > MAX_PHOTO_SIZE) {
          toast.error("A foto pode ter no máximo 10MB.");
          continue;
        }
        const blob = await compressImage(file);
        const extension =
          blob.type === "image/jpeg"
            ? "jpg"
            : file.name.split(".").pop() ?? "jpg";
        const path = photoStoragePath(activityId, extension);
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
        <CardContent className="flex flex-col gap-3">
          {onRegister ? (
            // CTA único de registrar — mesmo tracejado do "Anexar foto",
            // mas a ação é o wizard de execução (fotos + relato juntos).
            <button
              type="button"
              onClick={onRegister}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-accent-brand/40 bg-accent-brand/5 p-5 text-center transition-colors hover:border-accent-brand/60 hover:bg-accent-brand/10"
            >
              <Camera className="size-5 text-accent-brand" />
              <span className="text-sm font-medium text-accent-brand">
                Registrar execução
              </span>
              <span className="text-xs text-muted-foreground">
                Anexe fotos e o relato do que foi feito
              </span>
            </button>
          ) : null}
          {photos.length > 0 || !onRegister ? (
            <PhotoAttach
              photos={photos.map((photo) => ({
                id: photo.id,
                url: publicPhotoUrl(photo.storagePath),
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
              readOnly={!canManage || !!onRegister}
            />
          ) : null}
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

  // Lookup direto no mapa (referência estável) — chamar categoryIcon()
  // aqui dispara o falso-positivo static-components do lint.
  const TypeIcon = activity.category ? CATEGORY_ICONS[activity.category] : null;

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
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-md px-2 py-1 text-sm font-normal text-foreground"
            >
              <TypeIcon className="size-3.5 text-foreground/70" />
              {CATEGORY_LABELS[activity.category]}
            </Badge>
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
