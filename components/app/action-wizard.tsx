"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  GraduationCap,
  Link2,
  MapPin,
  Megaphone,
  PenLine,
  Presentation,
  Route,
  Search,
  SearchX,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryBadge } from "@/components/app/category-badge";
import { DatePicker } from "@/components/app/date-picker";
import { StatusBadge } from "@/components/app/status-badge";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { registerExecution } from "@/lib/actions/execution";
import {
  getWizardChannelContext,
  scheduleActivity,
  type WizardActivity,
  type WizardChannelContext,
} from "@/lib/actions/wizard";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/config";
import type { ChannelOption } from "@/lib/db/execution";
import { formatRelativeDue } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";
import {
  MAX_DESCRIPTION,
  PhotoNudgeDrawer,
  PhotoSection,
  usePhotoDrafts,
} from "@/app/(app)/registrar/register-shared";

// ── Types ──────────────────────────────────────────────────────────────

export type WizardMode = "agendar" | "registrar";

type WizardView =
  | "bifurcation"
  | "channel"
  | "agendar-form"
  | "agendar-confirm"
  | "registrar-pick"
  | "registrar-complete"
  | "registrar-adhoc"
  | "success";

export type ActionWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: ChannelOption[];
  defaultChannelId?: string | null;
  defaultActivityId?: string | null;
  defaultDate?: string | null;
  defaultMode?: WizardMode | null;
};

// ── Category icons (same as adhoc form) ────────────────────────────────

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  reuniao_gerente: Presentation,
  treinamento: GraduationCap,
  rodada_canal: Route,
  geracao_demanda: Megaphone,
};

// ── Internal context ───────────────────────────────────────────────────

type WizardCtx = {
  mode: WizardMode | null;
  view: WizardView;
  channelId: string | null;
  channelName: string | null;
  channelCtx: WizardChannelContext | null;
  loadingCtx: boolean;
  date: string | null;
  selectedActivity: WizardActivity | null;
  setView: (v: WizardView) => void;
  setMode: (m: WizardMode) => void;
  setChannel: (id: string, name: string) => void;
  setSelectedActivity: (a: WizardActivity | null) => void;
  reset: () => void;
  close: () => void;
};

const WizardContext = React.createContext<WizardCtx | null>(null);

function useWizard() {
  const ctx = React.useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside ActionWizard");
  return ctx;
}

// ── useMediaQuery ──────────────────────────────────────────────────────

function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    [query]
  );
  const getSnapshot = React.useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// ── View → progress mapping ────────────────────────────────────────────

function viewProgress(view: WizardView, mode: WizardMode | null): number {
  if (view === "bifurcation") return 0;
  if (view === "channel") return 0.2;
  if (view === "success") return 1;
  if (mode === "agendar") {
    if (view === "agendar-form") return 0.5;
    if (view === "agendar-confirm") return 0.8;
  }
  if (mode === "registrar") {
    if (view === "registrar-pick") return 0.4;
    if (view === "registrar-complete" || view === "registrar-adhoc") return 0.7;
  }
  return 0.5;
}

function viewTitle(view: WizardView): string {
  switch (view) {
    case "bifurcation":
      return "O que você quer fazer?";
    case "channel":
      return "Selecione o canal";
    case "agendar-form":
      return "Detalhes da atividade";
    case "agendar-confirm":
      return "Confirmar agendamento";
    case "registrar-pick":
      return "Selecione a atividade";
    case "registrar-complete":
      return "Concluir atividade";
    case "registrar-adhoc":
      return "Ação fora do plano";
    case "success":
      return "Concluído";
  }
}

// ── Step 0: Bifurcation ────────────────────────────────────────────────

function BifurcationStep() {
  const { setMode, setView, channelId } = useWizard();

  function pick(mode: WizardMode) {
    setMode(mode);
    if (!channelId) {
      setView("channel");
    } else {
      setView(mode === "agendar" ? "agendar-form" : "registrar-pick");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => pick("agendar")}
          className="flex items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#0063A7]/10">
            <Calendar className="size-6 text-[#0063A7]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Agendar atividade</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Planeje algo que você vai fazer
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={() => pick("registrar")}
          className="flex items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <Camera className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Registrar execução</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Marque algo que você já fez
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ── Channel picker ─────────────────────────────────────────────────────

function ChannelPickerStep({ channels }: { channels: ChannelOption[] }) {
  const { setChannel, mode, setView } = useWizard();

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        Escolha o canal onde a ação será registrada.
      </p>
      <div className="flex flex-col gap-2">
        {channels.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setChannel(ch.id, ch.name)}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
          >
            <Store className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{ch.name}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {ch.openActivityCount > 0
                  ? `${ch.openActivityCount} ${ch.openActivityCount === 1 ? "atividade aberta" : "atividades abertas"}`
                  : "Nenhuma atividade aberta"}
              </p>
            </div>
            {ch.openActivityCount > 0 && (
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {ch.openActivityCount}
              </Badge>
            )}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
      {!mode && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground"
          onClick={() => setView("bifurcation")}
        >
          Voltar
        </Button>
      )}
    </div>
  );
}

// ── PA2: Agendar form ──────────────────────────────────────────────────

function AgendarFormStep() {
  const { channelCtx, loadingCtx, setView, date: defaultDate } = useWizard();
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<ActivityCategory | null>(null);
  const [problemId, setProblemId] = React.useState<string | null>(null);
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState<string | null>(
    defaultDate ?? null
  );
  const [description, setDescription] = React.useState("");

  if (loadingCtx || !channelCtx) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    );
  }

  const { branches, problems, responsibles } = channelCtx;
  const hasProblems = problems.length > 0;

  const canContinue =
    title.trim().length > 0 && category !== null && dueDate !== null;

  const disabledHint = !title.trim()
    ? "Informe o título da atividade."
    : !category
      ? "Escolha o tipo de ação."
      : !dueDate
        ? "Selecione o prazo."
        : null;

  function handleContinue() {
    if (!canContinue) return;
    agendarFormRef.current = {
      title,
      category: category!,
      problemId,
      branchId,
      assigneeIds,
      dueDate: dueDate!,
      description,
    };
    setView("agendar-confirm");
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      {/* Título */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="wz-title">
          Título <span className="text-destructive">*</span>
        </label>
        <Input
          id="wz-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Treinamento da equipe sobre biológicos"
          className="text-base"
          maxLength={200}
        />
      </fieldset>

      {/* Tipo de ação */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Tipo de ação <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITY_CATEGORIES.map((item) => {
            const Icon = CATEGORY_ICONS[item];
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-14 items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-card text-foreground hover:bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="leading-tight text-xs">
                  {CATEGORY_LABELS[item]}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Meta */}
      {hasProblems && (
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Meta do plano</label>
          <div className="flex flex-col gap-1.5">
            {problems.map((p) => {
              const active = problemId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProblemId(active ? null : p.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-card hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                      active
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/50"
                    )}
                  >
                    {active && (
                      <span className="size-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  <span className="leading-snug">{p.title}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Local */}
      {branches.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Local</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBranchId(null)}
              className={cn(
                "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                branchId === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-muted/50"
              )}
            >
              Canal geral
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBranchId(b.id)}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                  branchId === b.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Responsável */}
      {responsibles.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Responsáveis</label>
          <div className="flex flex-wrap gap-2">
            {responsibles.map((r) => {
              const active = assigneeIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    setAssigneeIds((prev) =>
                      active
                        ? prev.filter((id) => id !== r.id)
                        : [...prev, r.id]
                    )
                  }
                  className={cn(
                    "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
          {assigneeIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Se nenhum for selecionado, você será o responsável.
            </p>
          )}
        </fieldset>
      )}

      {/* Prazo */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Prazo <span className="text-destructive">*</span>
        </label>
        <DatePicker
          value={dueDate}
          onChange={setDueDate}
          placeholder="Selecione o prazo"
        />
      </fieldset>

      {/* Descrição */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="wz-desc">
          Descrição{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id="wz-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={MAX_DESCRIPTION}
          placeholder="Detalhe o que precisa ser feito e o resultado esperado."
          className="min-h-20"
        />
        <span className="self-end text-xs text-muted-foreground tabular-nums">
          {description.length}/{MAX_DESCRIPTION}
        </span>
      </fieldset>

      {/* Footer */}
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={handleContinue} disabled={!canContinue}>
          Continuar
        </Button>
        {disabledHint && (
          <p className="text-center text-xs text-muted-foreground">
            {disabledHint}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shared ref for form data between agendar steps ─────────────────────

const agendarFormRef: { current: {
  title: string;
  category: ActivityCategory;
  problemId: string | null;
  branchId: string | null;
  assigneeIds: string[];
  dueDate: string;
  description: string;
} | null } = { current: null };

function ConfirmRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  );
}

// ── PA2: Agendar confirm ───────────────────────────────────────────────

function AgendarConfirmStep() {
  const { channelId, channelName, channelCtx, setView } = useWizard();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = agendarFormRef.current;
  if (!form || !channelId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Erro: dados não encontrados.</p>
      </div>
    );
  }

  const branchName =
    channelCtx?.branches.find((b) => b.id === form.branchId)?.name ?? null;
  const problemName =
    channelCtx?.problems.find((p) => p.id === form.problemId)?.title ?? null;
  const assigneeNames = form.assigneeIds
    .map((id) => channelCtx?.responsibles.find((r) => r.id === id)?.name)
    .filter(Boolean);

  async function handleSubmit() {
    if (!form || !channelId) return;
    setSubmitting(true);
    setError(null);
    const result = await scheduleActivity({
      channelId,
      title: form.title,
      category: form.category,
      description: form.description || undefined,
      problemId: form.problemId,
      branchId: form.branchId,
      assigneeIds: form.assigneeIds,
      dueDate: form.dueDate,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Atividade agendada com sucesso!");
    router.refresh();
    setView("success");
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <p className="text-base font-semibold leading-snug">{form.title}</p>
        <Separator />
        <ConfirmRow label="Canal">{channelName}</ConfirmRow>
        <ConfirmRow label="Tipo">
          <CategoryBadge category={form.category} />
        </ConfirmRow>
        {problemName && <ConfirmRow label="Meta">{problemName}</ConfirmRow>}
        <ConfirmRow label="Local">{branchName ?? "Canal geral"}</ConfirmRow>
        <ConfirmRow label="Responsáveis">
          {assigneeNames.length > 0 ? assigneeNames.join(", ") : "Você"}
        </ConfirmRow>
        <ConfirmRow label="Prazo">
          {format(new Date(form.dueDate + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}
        </ConfirmRow>
        {form.description && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p className="mt-1 text-sm leading-relaxed">{form.description}</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setView("agendar-form")}
          disabled={submitting}
        >
          Voltar
        </Button>
        <Button
          className="flex-1"
          onClick={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Spinner className="size-4" />
              Agendando...
            </>
          ) : (
            <>
              <Calendar className="size-4" />
              Agendar atividade
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── PA3: Registrar pick (sub-bifurcation) ──────────────────────────────

function RegistrarPickStep() {
  const { channelCtx, loadingCtx, setView, setSelectedActivity } = useWizard();
  const [search, setSearch] = React.useState("");

  if (loadingCtx || !channelCtx) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    );
  }

  const { openActivities } = channelCtx;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? openActivities.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.branchName ?? "").toLowerCase().includes(q)
      )
    : openActivities;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {/* CTA adhoc */}
      <button
        type="button"
        onClick={() => setView("registrar-adhoc")}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#0063A7]/15 bg-[#0063A7]/5 p-4 text-left transition-colors hover:bg-[#0063A7]/10 active:bg-[#0063A7]/15 dark:border-[#0063A7]/25 dark:bg-[#0063A7]/10"
      >
        <PenLine className="size-5 shrink-0 text-[#0063A7]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Registrar ação fora do plano</p>
          <p className="text-xs text-muted-foreground">
            Realizou algo que não estava planejado? Registre aqui.
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-[#0063A7]" />
      </button>

      <div className="relative flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="shrink-0 text-xs text-muted-foreground">
          ou selecione uma atividade planejada
        </span>
        <Separator className="flex-1" />
      </div>

      {/* Search */}
      {openActivities.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar atividade..."
            className="h-10 pl-9"
          />
        </div>
      )}

      {/* Activity list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {q
                ? "Nenhum resultado para essa busca."
                : "Nenhuma atividade planejada aberta."}
            </p>
          </div>
        ) : (
          filtered.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => {
                setSelectedActivity(activity);
                setView("registrar-complete");
              }}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="line-clamp-1 text-sm font-medium leading-snug">
                    {activity.title}
                  </p>
                  {activity.isMine && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-primary/10 text-primary hover:bg-primary/10 text-xs"
                    >
                      minha
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={activity.status} />
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      activity.status === "atrasada"
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatRelativeDue(activity.dueDate)}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── PA3 Step 3A: Complete planned activity ─────────────────────────────

function RegistrarCompleteStep() {
  const { selectedActivity, setView } = useWizard();
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { photos, rejected, addFiles, removePhoto, uploadAll } =
    usePhotoDrafts();
  const [description, setDescription] = React.useState("");
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!selectedActivity) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Nenhuma atividade selecionada.</p>
      </div>
    );
  }

  const activity = selectedActivity;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const paths = await uploadAll();
      const result = await registerExecution({
        activityId: activity.id,
        description: description.trim(),
        markCompleted: true,
        photoPaths: paths,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Atividade concluída!");
      router.refresh();
      setView("success");
    } catch {
      setError("Falha ao enviar as fotos — sinal fraco? Tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleConclude() {
    if (photos.length === 0 && !error) {
      setNudgeOpen(true);
      return;
    }
    void submit();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {/* Activity card (read-only) */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <p className="font-medium leading-snug">{activity.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={activity.status} />
          {activity.category && (
            <CategoryBadge category={activity.category} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span>{activity.branchName ?? "Canal geral"}</span>
          </div>
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                activity.status === "atrasada" &&
                  "font-medium text-red-600 dark:text-red-400"
              )}
            >
              {formatRelativeDue(activity.dueDate)}
            </span>
          </div>
          {activity.problemTitle && (
            <div className="col-span-2 flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span>{activity.problemTitle}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="wz-exec-desc">
          O que aconteceu?{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id="wz-exec-desc"
          value={description}
          maxLength={MAX_DESCRIPTION}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Adicione detalhes se a execução foi diferente do planejado."
          className="min-h-20"
        />
        <span className="self-end text-xs text-muted-foreground tabular-nums">
          {description.length}/{MAX_DESCRIPTION}
        </span>
      </fieldset>

      {/* Photos */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Fotos{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <PhotoSection
          photos={photos}
          rejected={rejected}
          onAdd={addFiles}
          onRemove={removePhoto}
          inputRef={fileRef}
        />
      </fieldset>

      {error && (
        <div
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setView("registrar-pick")}
          disabled={submitting}
        >
          Voltar
        </Button>
        <Button
          className="flex-1"
          onClick={handleConclude}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Spinner className="size-4" />
              Concluindo...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Concluir atividade
            </>
          )}
        </Button>
      </div>

      <PhotoNudgeDrawer
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        onAddPhoto={() => fileRef.current?.click()}
        onConfirm={() => void submit()}
      />
    </div>
  );
}

// ── PA3 Step 3B: Adhoc (ação fora do plano) ────────────────────────────

function RegistrarAdhocStep() {
  const { channelId, channelCtx, setView } = useWizard();
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { photos, rejected, addFiles, removePhoto, uploadAll } =
    usePhotoDrafts();

  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<ActivityCategory | null>(null);
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [problemChoice, setProblemChoice] = React.useState<
    string | "later" | null
  >(null);
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!channelCtx || !channelId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    );
  }

  const { branches, problems } = channelCtx;
  const hasProblems = problems.length > 0;
  const problemOk = !hasProblems || problemChoice !== null;
  const canSubmit =
    description.trim().length > 0 && category !== null && problemOk;

  const disabledHint = !description.trim()
    ? "Descreva o que foi feito."
    : !category
      ? "Escolha o tipo de ação."
      : !problemOk
        ? 'Escolha uma meta ou "Vincular depois".'
        : null;

  async function submit() {
    if (!canSubmit || !category || !channelId) return;
    setSubmitting(true);
    setError(null);
    try {
      const paths = await uploadAll();
      const result = await registerExecution({
        ...(branchId
          ? { adhocBranchId: branchId }
          : { adhocChannelId: channelId }),
        description,
        category,
        problemId:
          problemChoice && problemChoice !== "later" ? problemChoice : null,
        markCompleted: true,
        photoPaths: paths,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Ação registrada com sucesso!");
      router.refresh();
      setView("success");
    } catch {
      setError("Falha ao enviar as fotos — sinal fraco? Tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRegister() {
    if (photos.length === 0 && !error) {
      setNudgeOpen(true);
      return;
    }
    void submit();
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      {/* Description */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="wz-adhoc-desc">
          O que foi feito? <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="wz-adhoc-desc"
          value={description}
          maxLength={MAX_DESCRIPTION}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Dia de campo sobre biológicos com 18 produtores"
          className="min-h-20 text-base"
        />
        <span className="self-end text-xs text-muted-foreground tabular-nums">
          {description.length}/{MAX_DESCRIPTION}
        </span>
      </fieldset>

      {/* Category */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Tipo de ação <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITY_CATEGORIES.map((item) => {
            const Icon = CATEGORY_ICONS[item];
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-14 items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-card text-foreground hover:bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="leading-tight text-xs">
                  {CATEGORY_LABELS[item]}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Branch */}
      {branches.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Local</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setBranchId(null);
                setProblemChoice(null);
              }}
              className={cn(
                "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                branchId === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-muted/50"
              )}
            >
              Canal geral
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBranchId(b.id);
                  setProblemChoice(null);
                }}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                  branchId === b.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Problem */}
      {hasProblems && (
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Meta do plano <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-col gap-1.5">
            {problems.map((p) => {
              const active = problemChoice === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProblemChoice(p.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "bg-card hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                      active
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/50"
                    )}
                  >
                    {active && (
                      <span className="size-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  <span className={cn("leading-snug", active && "text-primary")}>
                    {p.title}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setProblemChoice("later")}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border-2 border-dashed p-3 text-left text-sm transition-colors",
                problemChoice === "later"
                  ? "border-primary/60 bg-primary/5"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Link2 className="size-4 shrink-0" />
              <div>
                <p className="font-medium leading-snug">Vincular depois</p>
                <p className="text-xs text-muted-foreground">
                  Fica como pendência.
                </p>
              </div>
            </button>
          </div>
        </fieldset>
      )}

      {/* Photos */}
      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Fotos{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <PhotoSection
          photos={photos}
          rejected={rejected}
          onAdd={addFiles}
          onRemove={removePhoto}
          inputRef={fileRef}
        />
      </fieldset>

      {error && (
        <div
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          onClick={handleRegister}
          disabled={submitting || !canSubmit}
        >
          {submitting ? (
            <>
              <Spinner className="size-4" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Registrar ação concluída
            </>
          )}
        </Button>
        {disabledHint && (
          <p className="text-center text-xs text-muted-foreground">
            {disabledHint}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setView("registrar-pick")}
          disabled={submitting}
        >
          Voltar
        </Button>
      </div>

      <PhotoNudgeDrawer
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        onAddPhoto={() => fileRef.current?.click()}
        onConfirm={() => void submit()}
      />
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────

function WizardSuccess() {
  const { mode, reset, close } = useWizard();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex size-20 items-center justify-center rounded-full bg-[#96CB40]/15 duration-500 animate-in zoom-in-50 fade-in">
        <div className="flex size-14 items-center justify-center rounded-full bg-[#96CB40] delay-150 duration-500 animate-in zoom-in-50 fill-mode-backwards">
          <Check className="size-8 text-white" strokeWidth={3} />
        </div>
      </div>
      <div className="text-center delay-200 duration-500 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards">
        <h3 className="text-lg font-semibold">
          {mode === "agendar"
            ? "Atividade agendada!"
            : "Execução registrada!"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "agendar"
            ? "Sua atividade foi adicionada ao plano."
            : "Sua ação foi registrada com sucesso."}
        </p>
      </div>
      <div className="flex gap-3 delay-300 duration-500 animate-in fade-in fill-mode-backwards">
        <Button variant="outline" onClick={reset}>
          {mode === "agendar" ? "Agendar outra" : "Registrar outra"}
        </Button>
        <Button onClick={close}>Fechar</Button>
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────

function StepProgress({ value }: { value: number }) {
  return (
    <div className="h-1 w-full bg-muted">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}


// ── Main wizard component ──────────────────────────────────────────────

export function ActionWizard({
  open,
  onOpenChange,
  channels,
  defaultChannelId,
  defaultActivityId,
  defaultDate,
  defaultMode,
}: ActionWizardProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const resolveInitialView = React.useCallback((): WizardView => {
    if (defaultMode && defaultChannelId) {
      if (defaultMode === "agendar") return "agendar-form";
      if (defaultMode === "registrar") {
        return defaultActivityId ? "registrar-complete" : "registrar-pick";
      }
    }
    if (defaultMode && !defaultChannelId) {
      return channels.length <= 1 ? (
        defaultMode === "agendar" ? "agendar-form" : "registrar-pick"
      ) : "channel";
    }
    return "bifurcation";
  }, [defaultMode, defaultChannelId, defaultActivityId, channels.length]);

  const [view, setView] = React.useState<WizardView>(resolveInitialView);
  const [mode, setMode] = React.useState<WizardMode | null>(
    defaultMode ?? null
  );
  const [channelId, setChannelId] = React.useState<string | null>(
    defaultChannelId ?? (channels.length === 1 ? channels[0].id : null)
  );
  const [channelName, setChannelName] = React.useState<string | null>(() => {
    const id = defaultChannelId ?? (channels.length === 1 ? channels[0].id : null);
    if (id) {
      const ch = channels.find((c) => c.id === id);
      return ch?.name ?? null;
    }
    return null;
  });
  const [channelCtx, setChannelCtx] = React.useState<WizardChannelContext | null>(null);
  const [ctxForChannelId, setCtxForChannelId] = React.useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = React.useState<WizardActivity | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const hasDirtyData =
    view !== "bifurcation" && view !== "channel" && view !== "success";

  React.useEffect(() => {
    if (!channelId) return;
    let cancelled = false;
    getWizardChannelContext(channelId).then((ctx) => {
      if (!cancelled) {
        setChannelCtx(ctx);
        setCtxForChannelId(channelId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const resolvedChannelCtx = channelId ? channelCtx : null;
  const loadingCtx = channelId !== null && ctxForChannelId !== channelId;

  function handleSetChannel(id: string, name: string) {
    setChannelId(id);
    setChannelName(name);
    if (mode === "agendar") setView("agendar-form");
    else if (mode === "registrar") setView("registrar-pick");
  }

  function handleReset() {
    setMode(defaultMode ?? null);
    const id = defaultChannelId ?? (channels.length === 1 ? channels[0].id : null);
    setChannelId(id);
    setChannelName(() => {
      if (id) {
        const ch = channels.find((c) => c.id === id);
        return ch?.name ?? null;
      }
      return null;
    });
    setSelectedActivity(null);
    setView(resolveInitialView());
    agendarFormRef.current = null;
  }

  function handleClose() {
    onOpenChange(false);
  }

  function tryClose() {
    if (hasDirtyData) {
      setShowConfirm(true);
    } else {
      handleClose();
    }
  }

  React.useEffect(() => {
    if (!open) {
      const timer = setTimeout(handleReset, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ctx: WizardCtx = {
    mode,
    view,
    channelId,
    channelName,
    channelCtx: resolvedChannelCtx,
    loadingCtx,
    date: defaultDate ?? null,
    selectedActivity,
    setView,
    setMode,
    setChannel: handleSetChannel,
    setSelectedActivity,
    reset: handleReset,
    close: handleClose,
  };

  const isSuccess = view === "success";
  const progress = viewProgress(view, mode);

  return (
    <WizardContext.Provider value={ctx}>
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) tryClose();
          else onOpenChange(true);
        }}
        modal
        swipeDirection={isDesktop ? "right" : "down"}
      >
        <DrawerContent
          className={cn(
            isDesktop &&
              "data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]"
          )}
        >
          <DrawerTitle className="sr-only">
            {mode === "agendar"
              ? "Agendar atividade"
              : mode === "registrar"
                ? "Registrar execução"
                : "Nova atividade"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Wizard para criar ou registrar atividades
          </DrawerDescription>

          {!isSuccess && <StepProgress value={progress} />}

          {!isSuccess && (
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="min-w-0">
                <p className="font-medium">{viewTitle(view)}</p>
                {channelName &&
                  view !== "channel" &&
                  view !== "bifurcation" && (
                    <p className="truncate text-sm text-muted-foreground">
                      {channelName}
                    </p>
                  )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={tryClose}
                className="shrink-0"
              >
                <X className="size-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {view === "bifurcation" && <BifurcationStep />}
            {view === "channel" && <ChannelPickerStep channels={channels} />}
            {view === "agendar-form" && <AgendarFormStep />}
            {view === "agendar-confirm" && <AgendarConfirmStep />}
            {view === "registrar-pick" && <RegistrarPickStep />}
            {view === "registrar-complete" && <RegistrarCompleteStep />}
            {view === "registrar-adhoc" && <RegistrarAdhocStep />}
            {view === "success" && <WizardSuccess />}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem dados preenchidos que serão perdidos ao fechar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setShowConfirm(false);
                handleClose();
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WizardContext.Provider>
  );
}
