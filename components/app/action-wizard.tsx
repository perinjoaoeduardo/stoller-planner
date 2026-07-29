"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import { toast } from "sonner";
import {
  Calendar,
  CalendarClock,
  CalendarPlus,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  MapPin,
  Pencil,
  PenLine,
  Search,
  SearchX,
  Store,
  Target,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { DatePicker } from "@/components/app/date-picker";
import { MetaPicker } from "@/components/app/meta-picker";
import { CategoryIconBox, IconBox } from "@/components/shared/icon-box";
import { PhotoAttach } from "@/components/shared/photo-attach";
import {
  WizardFooter,
  WizardStepper,
} from "@/components/shared/wizard-shell";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { registerExecution } from "@/lib/actions/execution";
import { getWizardChannelContext, scheduleActivity } from "@/lib/actions/wizard";
import type { WizardActivity, WizardChannelContext } from "@/lib/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
  MAX_DESCRIPTION,
  type ActivityCategory,
} from "@/lib/config";
import type { ChannelOption } from "@/lib/db/execution";
import { formatRelativeDue } from "@/lib/plan-utils";
import { cn, getInitials } from "@/lib/utils";
import {
  PhotoNudgeOverlay,
  usePhotoDrafts,
} from "@/app/(app)/registrar/register-shared";

// ── Types ──────────────────────────────────────────────────────────────

export type WizardMode = "agendar" | "registrar";

type WizardView =
  | "bifurcation"
  | "channel"
  | "agendar-1"
  | "agendar-2"
  | "agendar-3"
  | "registrar-pick"
  | "registrar-complete"
  | "adhoc";

/**
 * Passos do fluxo de agendar — TRÊS, não quatro.
 *
 * "Revisão" era uma tela inteira só para reler. Ela virou um resumo no
 * pé do último passo, e revisa apenas o que NÃO está na tela: canal,
 * tipo, meta, local e responsáveis. Repetir ali o prazo que está no
 * campo logo acima seria pedir para conferir o que a pessoa acabou de
 * digitar.
 */
const AGENDAR_STEPS: { view: WizardView; label: string }[] = [
  { view: "agendar-1", label: "O quê" },
  { view: "agendar-2", label: "Contexto" },
  { view: "agendar-3", label: "Quando" },
];

function agendarStepIndex(view: WizardView): number {
  return AGENDAR_STEPS.findIndex((s) => s.view === view);
}

/** Rascunho do registro fora do plano — persiste entre os 3 passos. */
type AdhocDraft = {
  description: string;
  category: ActivityCategory | null;
  branchId: string | null;
  problemChoice: string | "later" | null;
};

const EMPTY_ADHOC: AdhocDraft = {
  description: "",
  category: null,
  branchId: null,
  problemChoice: null,
};

/** Rascunho do agendamento — vive no pai pra persistir entre os passos. */
type AgendarDraft = {
  title: string;
  category: ActivityCategory | null;
  problemId: string | null;
  branchId: string | null;
  assigneeIds: string[];
  dueDate: string | null;
  description: string;
};

function emptyDraft(defaultDate: string | null): AgendarDraft {
  return {
    title: "",
    category: null,
    problemId: null,
    branchId: null,
    assigneeIds: [],
    dueDate: defaultDate,
    description: "",
  };
}

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

/** Grid 2x2 de tipos de ação selecionáveis — compartilhado agendar/adhoc. */
function CategoryGrid({
  value,
  onChange,
}: {
  value: ActivityCategory | null;
  onChange: (category: ActivityCategory) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTIVITY_CATEGORIES.map((item) => {
        const active = value === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-pressed={active}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
              active
                ? "border-primary/40 bg-primary/5 ring-2 ring-primary/15"
                : "border-border bg-card hover:border-border-hover hover:bg-muted"
            )}
          >
            <CategoryIconBox category={item} />
            <span className="text-xs font-medium leading-tight">
              {CATEGORY_LABELS[item]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Internal context ───────────────────────────────────────────────────

type WizardCtx = {
  mode: WizardMode | null;
  view: WizardView;
  channelId: string | null;
  channelName: string | null;
  channelCtx: WizardChannelContext | null;
  loadingCtx: boolean;
  selectedActivity: WizardActivity | null;
  draft: AgendarDraft;
  updateDraft: (patch: Partial<AgendarDraft>) => void;
  submitting: boolean;
  submitError: string | null;
  submitAgendar: () => Promise<void>;
  adhoc: AdhocDraft;
  updateAdhoc: (patch: Partial<AdhocDraft>) => void;
  photoDrafts: ReturnType<typeof usePhotoDrafts>;
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

function viewTitle(view: WizardView): string {
  switch (view) {
    case "bifurcation":
      return "O que você quer fazer?";
    case "channel":
      return "Selecione o canal";
    case "agendar-1":
    case "agendar-2":
    case "agendar-3":
      return "Agendar atividade";
    case "registrar-pick":
      return "Selecione a atividade";
    case "registrar-complete":
      return "Concluir atividade";
    case "adhoc":
      return "Registrar execução";
  }
}

// ── Stepper (FIX 2) ────────────────────────────────────────────────────

/** Pergunta guia no topo de cada passo. */
function StepIntro({ question, hint }: { question: string; hint: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{question}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

// ── Step 0: Bifurcation ────────────────────────────────────────────────

function BifurcationOption({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-hover hover:bg-muted"
    >
      <IconBox
        icon={Icon}
        size="lg"
        className="size-11 bg-accent-brand/10"
        iconClassName="text-accent-brand"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/** Opções da bifurcação — renderiza dentro do Dialog (desktop) ou Drawer (mobile). */
function BifurcationOptions() {
  const { setMode, setView, channelId } = useWizard();

  function pick(mode: WizardMode) {
    setMode(mode);
    if (!channelId) {
      setView("channel");
    } else {
      setView(mode === "agendar" ? "agendar-1" : "registrar-pick");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <BifurcationOption
        icon={Calendar}
        title="Agendar atividade"
        description="Planeje algo que você vai fazer"
        onClick={() => pick("agendar")}
      />
      <BifurcationOption
        icon={Camera}
        title="Registrar execução"
        description="Marque algo que você já fez"
        onClick={() => pick("registrar")}
      />
    </div>
  );
}

function BifurcationStep() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <BifurcationOptions />
    </div>
  );
}

// ── Channel picker ─────────────────────────────────────────────────────

function ChannelPickerStep({ channels }: { channels: ChannelOption[] }) {
  const { setChannel, setView } = useWizard();
  const [search, setSearch] = React.useState("");

  // Canal com mais trabalho primeiro.
  const sorted = React.useMemo(
    () =>
      [...channels].sort((a, b) => b.openActivityCount - a.openActivityCount),
    [channels]
  );
  const q = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter((ch) => ch.name.toLowerCase().includes(q))
    : sorted;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <p className="text-sm text-muted-foreground">
        Escolha o canal onde a atividade será registrada.
      </p>
      {channels.length > 6 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canal..."
            className="h-10 border-input bg-card pl-9"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        {filtered.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setChannel(ch.id, ch.name)}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-hover hover:bg-muted"
          >
            <IconBox icon={Store} size="lg" iconClassName="size-4" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{ch.name}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {ch.openActivityCount > 0
                  ? `${ch.openActivityCount} ${ch.openActivityCount === 1 ? "atividade aberta" : "atividades abertas"}`
                  : "Nenhuma atividade aberta"}
              </p>
            </div>
            {ch.openActivityCount > 0 && (
              <Badge
                variant="secondary"
                className="shrink-0 rounded-full px-2 py-0.5 font-normal tabular-nums text-foreground"
              >
                {ch.openActivityCount}
              </Badge>
            )}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
      </div>
      <WizardFooter onBack={() => setView("bifurcation")} />
    </>
  );
}

// ── Agendar · Passo 1: O quê (FIX 3) ───────────────────────────────────

function AgendarStep1() {
  const { draft, updateDraft } = useWizard();

  return (
    <div className="flex flex-col gap-5 p-6">
      <StepIntro
        question="O que você vai fazer?"
        hint="Dê um nome e escolha o tipo da atividade."
      />

      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="wz-title">
          Título <span className="text-destructive">*</span>
        </label>
        <Input
          id="wz-title"
          autoFocus
          value={draft.title}
          onChange={(e) => updateDraft({ title: e.target.value })}
          placeholder="Ex: Treinamento da equipe sobre biológicos"
          className="border-input bg-card text-base"
          maxLength={200}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Tipo de atividade <span className="text-destructive">*</span>
        </label>
        <CategoryGrid
          value={draft.category}
          onChange={(category) => updateDraft({ category })}
        />
      </fieldset>
    </div>
  );
}

// ── Agendar · Passo 2: Contexto (FIX 4) ────────────────────────────────

function AgendarStep2() {
  const { channelCtx, loadingCtx, draft, updateDraft } = useWizard();

  if (loadingCtx || !channelCtx) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    );
  }

  const { branches, problems, responsibles } = channelCtx;

  return (
    <div className="flex flex-col gap-8 p-6">
      <StepIntro
        question="Onde essa atividade se encaixa?"
        hint="Vincule a uma meta e defina local e responsáveis."
      />

      {problems.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-semibold text-foreground">
              Meta do plano
            </label>
            <span className="text-xs text-muted-foreground">Opcional</span>
          </div>
          <RadioGroup
            value={draft.problemId ?? "none"}
            onValueChange={(value) =>
              updateDraft({
                problemId: value === "none" ? null : String(value),
              })
            }
            className="flex flex-col gap-1.5 rounded-xl border border-border bg-subtle p-1.5"
          >
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                draft.problemId === null
                  ? "bg-card shadow-card! ring-1 ring-primary/20"
                  : "hover:bg-card/60"
              )}
            >
              <RadioGroupItem value="none" />
              <span className="italic text-muted-foreground">Sem vínculo</span>
            </label>
            {problems.map((p) => {
              const active = draft.problemId === p.id;
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-card shadow-card! ring-1 ring-primary/20"
                      : "hover:bg-card/60"
                  )}
                >
                  <RadioGroupItem value={p.id} className="mt-0.5" />
                  <span className="leading-snug">{p.title}</span>
                </label>
              );
            })}
          </RadioGroup>
        </fieldset>
      )}

      {branches.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Local</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: null as string | null, name: "Canal geral" },
              ...branches,
            ].map((b) => {
              const active = draft.branchId === b.id;
              return (
                <button
                  key={b.id ?? "geral"}
                  type="button"
                  onClick={() => updateDraft({ branchId: b.id })}
                  aria-pressed={active}
                  className={cn(
                    "h-9 cursor-pointer rounded-full border px-3 text-sm font-medium transition-colors",
                    active
                      ? "border-primary/40 bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  )}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {responsibles.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">
            Responsáveis
          </label>
          <div className="flex flex-wrap gap-2">
            {responsibles.map((r) => {
              const active = draft.assigneeIds.includes(r.id);
              return (
                <Button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    updateDraft({
                      assigneeIds: active
                        ? draft.assigneeIds.filter((id) => id !== r.id)
                        : [...draft.assigneeIds, r.id],
                    })
                  }
                  aria-pressed={active}
                  variant="outline"
                  className={cn(
                    "gap-2 rounded-full font-medium",
                    active &&
                      "border-primary/40 bg-primary/5 text-primary ring-2 ring-primary/15 hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <Avatar className="size-5">
                    <AvatarFallback className="bg-border text-[9px] font-semibold text-foreground/70">
                      {getInitials(r.name)}
                    </AvatarFallback>
                  </Avatar>
                  {r.name}
                  {active && <Check className="size-3" />}
                </Button>
              );
            })}
          </div>
          {draft.assigneeIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Se nenhum for selecionado, você será o responsável.
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}

// ── Agendar · Passo 3: Quando (FIX 5) ──────────────────────────────────

const DUE_SHORTCUTS: { label: string; resolve: () => Date }[] = [
  { label: "Em 1 semana", resolve: () => addDays(new Date(), 7) },
  { label: "Em 2 semanas", resolve: () => addDays(new Date(), 14) },
  { label: "Em 1 mês", resolve: () => addMonths(new Date(), 1) },
];

function AgendarStep3() {
  const { channelName, channelCtx, draft, updateDraft, submitError } =
    useWizard();

  const TypeIcon = draft.category ? CATEGORY_ICONS[draft.category] : null;
  const branchName =
    channelCtx?.branches.find((b) => b.id === draft.branchId)?.name ?? null;
  const problemName =
    channelCtx?.problems.find((p) => p.id === draft.problemId)?.title ?? null;
  const assigneeNames = draft.assigneeIds
    .map((id) => channelCtx?.responsibles.find((r) => r.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <StepIntro
        question="Para quando?"
        hint="Defina o prazo e detalhe se precisar."
      />

      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Prazo <span className="text-destructive">*</span>
        </label>
        <div className="flex flex-wrap gap-2 pb-1">
          {DUE_SHORTCUTS.map((s) => (
            <Button
              key={s.label}
              type="button"
              variant="outline"
              size="xs"
              onClick={() =>
                updateDraft({ dueDate: format(s.resolve(), "yyyy-MM-dd") })
              }
              className="h-7 rounded-full px-2.5 font-normal"
            >
              {s.label}
            </Button>
          ))}
        </div>
        <DatePicker
          value={draft.dueDate}
          onChange={(value) => updateDraft({ dueDate: value })}
          placeholder="Selecione o prazo"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="wz-desc">
          Descrição{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id="wz-desc"
          value={draft.description}
          onChange={(e) => updateDraft({ description: e.target.value })}
          maxLength={MAX_DESCRIPTION}
          placeholder="Detalhe o que precisa ser feito e o resultado esperado."
          className="min-h-20"
        />
        <span className="self-end text-xs text-muted-foreground tabular-nums">
          {draft.description.length}/{MAX_DESCRIPTION}
        </span>
      </fieldset>

      {/* Resumo do que ficou para trás. Só o que NÃO está nesta tela —
          conferir o prazo que está no campo acima seria pedir para a
          pessoa reler o que ela acabou de digitar. O lápis volta ao
          passo dono do campo. */}
      <div className="rounded-xl border border-border">
        <div className="border-b border-border p-4">
          <p className="text-base font-semibold leading-snug">
            {draft.title || (
              <span className="italic text-muted-foreground">Sem título</span>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <ReviewRow label="Canal">{channelName}</ReviewRow>
          <ReviewRow label="Tipo" editView="agendar-1">
            {draft.category && TypeIcon ? (
              <Badge
                variant="secondary"
                className="gap-1.5 rounded-md px-2 py-1 font-normal text-foreground"
              >
                <TypeIcon className="size-3.5 text-foreground/70" />
                {CATEGORY_LABELS[draft.category]}
              </Badge>
            ) : (
              <span className="italic text-muted-foreground">Sem tipo</span>
            )}
          </ReviewRow>
          <ReviewRow label="Meta" editView="agendar-2">
            {problemName ?? (
              <span className="italic text-muted-foreground">Sem vínculo</span>
            )}
          </ReviewRow>
          <ReviewRow label="Local" editView="agendar-2">
            {branchName ?? "Canal geral"}
          </ReviewRow>
          <ReviewRow label="Responsáveis" editView="agendar-2">
            {assigneeNames.length > 0 ? assigneeNames.join(", ") : "Você"}
          </ReviewRow>
        </div>
      </div>

      {submitError && (
        <div
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  label,
  editView,
  children,
}: {
  label: string;
  editView?: WizardView;
  children: React.ReactNode;
}) {
  const { setView } = useWizard();
  return (
    <div className="group flex items-start justify-between gap-3">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right text-sm text-foreground">
        {children}
        {/* Slot fixo em TODAS as linhas — os valores alinham na mesma
            borda mesmo quando a linha não tem lápis (ex.: Canal). */}
        <span className="flex size-3.5 shrink-0 items-center justify-center">
          {editView && (
            <button
              type="button"
              aria-label={`Editar ${label}`}
              onClick={() => setView(editView)}
              className="cursor-pointer opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </span>
      </span>
    </div>
  );
}

// ── Rodapé fixo do fluxo de agendar (FIX 2) ────────────────────────────

function agendarStepValidation(
  view: WizardView,
  draft: AgendarDraft
): { canContinue: boolean; hint: string | null } {
  if (view === "agendar-1") {
    const ok = draft.title.trim().length > 0 && draft.category !== null;
    return {
      canContinue: ok,
      hint: ok ? null : "Preencha o título e escolha o tipo",
    };
  }
  if (view === "agendar-3") {
    const ok = draft.dueDate !== null;
    return { canContinue: ok, hint: ok ? null : "Selecione o prazo" };
  }
  return { canContinue: true, hint: null };
}

function AgendarFooter() {
  const { view, setView, draft, submitting, submitAgendar } = useWizard();
  const idx = agendarStepIndex(view);
  const isUltimo = view === "agendar-3";
  const { canContinue, hint } = agendarStepValidation(view, draft);

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6 sm:py-4">
      <div>
        {idx > 0 && (
          <Button
            variant="outline"
            onClick={() => setView(AGENDAR_STEPS[idx - 1].view)}
            disabled={submitting}
          >
            Voltar
          </Button>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-3">
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {isUltimo ? (
          <Button
            variant="brand"
            onClick={() => void submitAgendar()}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner className="size-4" />
                Agendando...
              </>
            ) : (
              <>
                <CalendarPlus className="size-4" />
                Agendar atividade
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="brand"
            disabled={!canContinue}
            onClick={() => setView(AGENDAR_STEPS[idx + 1].view)}
          >
            Continuar
          </Button>
        )}
      </div>
    </div>
  );
}

// ── PA3: Registrar pick (sub-bifurcation) ──────────────────────────────

/**
 * Prazo na lista do registrar — regra de alarme único: quando o badge já
 * diz "Atrasada", o texto do prazo fica neutro. Futuro: 0-7 dias âmbar.
 */
function pickDueClass(activity: WizardActivity): string {
  if (activity.status === "atrasada" || !activity.dueDate) {
    return "text-muted-foreground";
  }
  const days = differenceInCalendarDays(
    parseISO(activity.dueDate),
    new Date()
  );
  if (days <= 7) return "text-warning";
  return "text-muted-foreground";
}

function RegistrarPickStep() {
  const { channelCtx, loadingCtx, setView, setSelectedActivity, photoDrafts } =
    useWizard();
  const [search, setSearch] = React.useState("");

  if (loadingCtx || !channelCtx) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    );
  }

  const { openActivities } = channelCtx;
  // Atrasadas primeiro, depois prazo mais próximo (padrão do app).
  const sorted = [...openActivities].sort((a, b) => {
    const rank = (x: WizardActivity) => (x.status === "atrasada" ? 0 : 1);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.dueDate === b.dueDate) return a.title.localeCompare(b.title);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });
  const q = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.branchName ?? "").toLowerCase().includes(q)
      )
    : sorted;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {/* CTA adhoc — tracejado comunica "criar algo novo" */}
        <button
          type="button"
          onClick={() => {
            photoDrafts.reset();
            setView("adhoc");
          }}
          className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-accent-brand/40 bg-accent-brand/5 p-4 text-left transition-all hover:border-accent-brand/60 hover:bg-accent-brand/10"
        >
          <IconBox
            icon={PenLine}
            size="lg"
            className="bg-accent-brand/10"
            iconClassName="size-4 text-accent-brand"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-accent-brand">
              Registrar atividade fora do plano
            </p>
            <p className="text-sm text-muted-foreground">
              Realizou algo que não estava planejado? Registre aqui.
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>

        <div className="relative flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="shrink-0 text-xs text-muted-foreground">
            ou selecione uma atividade planejada
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Search */}
        {openActivities.length > 5 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar atividade..."
              className="h-10 border-input bg-card pl-9"
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
                  photoDrafts.reset();
                  setSelectedActivity(activity);
                  setView("registrar-complete");
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-all hover:border-border-hover hover:bg-muted"
              >
                {activity.category ? (
                  <CategoryIconBox category={activity.category} />
                ) : (
                  <IconBox icon={PenLine} size="md" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-1 text-sm font-medium leading-snug">
                      {activity.title}
                    </p>
                    {activity.isMine && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        <User className="size-3" />
                        minha
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={activity.status} />
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        pickDueClass(activity)
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
      <WizardFooter onBack={() => setView("channel")} />
    </>
  );
}

// ── PA3 Step 3A: Complete planned activity ─────────────────────────────

function RegistrarCompleteStep() {
  const {
    selectedActivity,
    loadingCtx,
    setView,
    photoDrafts,
    close,
  } = useWizard();
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { photos, rejected, addFiles, removePhoto, uploadAll } = photoDrafts;
  const [description, setDescription] = React.useState("");
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!selectedActivity) {
    // Abertura direta pelo activityId: o contexto ainda está chegando —
    // mesmo padrão de loading dos outros passos do wizard.
    if (loadingCtx) {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <Spinner className="size-6" />
        </div>
      );
    }
    // Atividade não está mais aberta (ou nada selecionado): oferece a
    // lista em vez de um beco sem saída.
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Nenhuma atividade selecionada.</p>
        <Button variant="outline" onClick={() => setView("registrar-pick")}>
          Escolher da lista
        </Button>
      </div>
    );
  }

  const activity = selectedActivity;
  const TypeIcon = activity.category ? CATEGORY_ICONS[activity.category] : null;

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
      // Sucesso vira toast no canto (Sonner discreto): o wizard fecha
      // na hora e o CTA de abrir a atividade vive na notificação.
      router.refresh();
      close();
      toast.success("Atividade concluída", {
        description: activity.title,
        duration: 6000,
        action: {
          label: "Ver atividade",
          onClick: () => router.push(`/atividades/${result.activityId}`),
        },
      });
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
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {/* Resumo da atividade — contexto de leitura, cinza sutil (FIX 4) */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-subtle p-4">
          <p className="font-medium leading-snug">{activity.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={activity.status} />
            {activity.category && TypeIcon && (
              <Badge
                variant="secondary"
                className="gap-1.5 rounded-md px-2 py-1 font-normal text-foreground"
              >
                <TypeIcon className="size-3.5 text-foreground/70" />
                {CATEGORY_LABELS[activity.category]}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span>{activity.branchName ?? "Canal geral"}</span>
            </div>
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              {/* Alarme único: o badge de status já comunica o atraso. */}
              <span className="text-muted-foreground">
                {formatRelativeDue(activity.dueDate)}
              </span>
            </div>
            {activity.problemTitle && (
              <div className="col-span-2 flex items-start gap-2">
                <Target className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span>{activity.problemTitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Relato */}
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="wz-exec-desc">
            O que aconteceu?{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
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

        {/* Fotos */}
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Fotos{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </label>
          <PhotoAttach
            photos={photos.map((photo) => ({ id: photo.id, url: photo.url }))}
            onAdd={addFiles}
            onRemove={removePhoto}
            inputRef={fileRef}
          />
          {rejected ? (
            <p className="text-xs text-destructive" role="alert">
              Alguma foto foi ignorada: use JPG, PNG ou WEBP até 10MB.
            </p>
          ) : null}
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
      </div>

      <WizardFooter
        onBack={() => setView("registrar-pick")}
        backDisabled={submitting}
      >
        <Button
          variant="brand"
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
      </WizardFooter>

      <PhotoNudgeOverlay
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        onAddPhoto={() => fileRef.current?.click()}
        onConfirm={() => void submit()}
      />
    </>
  );
}

// ── Registrar fora do plano · 3 passos (FIX 3) ─────────────────────────

/**
 * Registro fora do plano — UMA página.
 *
 * Eram dois passos, e nenhum deles era uma decisão grande o bastante
 * para merecer tela própria: relato + tipo, depois local + meta + foto.
 * Tudo junto cabe numa rolagem, e o formulário inteiro à vista permite
 * conferir antes de enviar em vez de ir e voltar entre passos. É a mesma
 * anatomia de "Concluir atividade", que já era uma página só.
 */
function AdhocStep() {
  const { channelId, channelCtx, loadingCtx, adhoc, updateAdhoc, photoDrafts, setView, close } =
    useWizard();
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { photos, rejected, addFiles, removePhoto, uploadAll } = photoDrafts;
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const branches = channelCtx?.branches ?? [];
  const problems = channelCtx?.problems ?? [];

  const podeRegistrar =
    adhoc.description.trim().length > 0 && adhoc.category !== null;

  async function submit() {
    if (!channelId || !adhoc.category || !adhoc.description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const paths = await uploadAll();
      const result = await registerExecution({
        ...(adhoc.branchId
          ? { adhocBranchId: adhoc.branchId }
          : { adhocChannelId: channelId }),
        description: adhoc.description,
        category: adhoc.category,
        problemId:
          adhoc.problemChoice && adhoc.problemChoice !== "later"
            ? adhoc.problemChoice
            : null,
        markCompleted: true,
        photoPaths: paths,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Sucesso vira toast no canto (Sonner discreto): o wizard fecha
      // na hora e o CTA de abrir a atividade vive na notificação.
      router.refresh();
      close();
      toast.success("Execução registrada", {
        description:
          adhoc.problemChoice === "later"
            ? `${adhoc.description.trim()} — meta pendente de vínculo.`
            : adhoc.description.trim(),
        duration: 6000,
        action: {
          label: "Ver atividade",
          onClick: () => router.push(`/atividades/${result.activityId}`),
        },
      });
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

  if (loadingCtx || !channelCtx) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="wz-adhoc-desc">
            O que foi feito? <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="wz-adhoc-desc"
            autoFocus
            value={adhoc.description}
            maxLength={MAX_DESCRIPTION}
            onChange={(e) => updateAdhoc({ description: e.target.value })}
            placeholder="Ex: Dia de campo sobre biológicos com 18 produtores"
            className="min-h-20 text-base"
          />
          <span className="self-end text-xs text-muted-foreground tabular-nums">
            {adhoc.description.length}/{MAX_DESCRIPTION}
          </span>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Tipo de atividade <span className="text-destructive">*</span>
          </label>
          <CategoryGrid
            value={adhoc.category}
            onChange={(category) => updateAdhoc({ category })}
          />
        </fieldset>

        {branches.length > 0 && (
          <fieldset className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Local</label>
            <div className="flex flex-wrap gap-2">
              {[{ id: null as string | null, name: "Canal geral" }, ...branches].map(
                (b) => {
                  const active = adhoc.branchId === b.id;
                  return (
                    <Button
                      key={b.id ?? "geral"}
                      type="button"
                      variant={active ? "default" : "outline"}
                      onClick={() => updateAdhoc({ branchId: b.id })}
                      aria-pressed={active}
                      className="rounded-full font-medium"
                    >
                      {b.name}
                    </Button>
                  );
                }
              )}
            </div>
          </fieldset>
        )}

        {problems.length > 0 && (
          <fieldset className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Meta do plano</label>
            <MetaPicker
              metas={problems.map((p) => ({ id: p.id, title: p.title }))}
              value={
                adhoc.problemChoice && adhoc.problemChoice !== "later"
                  ? adhoc.problemChoice
                  : null
              }
              onChange={(value) =>
                updateAdhoc({ problemChoice: value ?? "later" })
              }
            />
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Fotos{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <PhotoAttach
            photos={photos.map((photo) => ({ id: photo.id, url: photo.url }))}
            onAdd={addFiles}
            onRemove={removePhoto}
            inputRef={fileRef}
          />
          {rejected ? (
            <p className="text-xs text-destructive" role="alert">
              Alguma foto foi ignorada: use JPG, PNG ou WEBP até 10MB.
            </p>
          ) : null}
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
      </div>

      <WizardFooter
        onBack={() => setView("registrar-pick")}
        backDisabled={submitting}
        hint={podeRegistrar ? null : "Descreva a atividade e escolha o tipo"}
      >
        <Button
          variant="brand"
          disabled={!podeRegistrar || submitting}
          onClick={handleRegister}
        >
          {submitting ? (
            <>
              <Spinner className="size-4" />
              Registrando...
            </>
          ) : (
            <>
              <Check className="size-4" />
              Registrar execução
            </>
          )}
        </Button>
      </WizardFooter>

      <PhotoNudgeOverlay
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        onAddPhoto={() => fileRef.current?.click()}
        onConfirm={() => void submit()}
      />
    </>
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
  const router = useRouter();

  const resolveInitialView = React.useCallback((): WizardView => {
    if (defaultMode && defaultChannelId) {
      if (defaultMode === "agendar") return "agendar-1";
      if (defaultMode === "registrar") {
        return defaultActivityId ? "registrar-complete" : "registrar-pick";
      }
    }
    if (defaultMode && !defaultChannelId) {
      return channels.length <= 1 ? (
        defaultMode === "agendar" ? "agendar-1" : "registrar-pick"
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

  // Rascunho do agendar — vive aqui pra persistir entre os passos.
  const [draft, setDraft] = React.useState<AgendarDraft>(() =>
    emptyDraft(defaultDate ?? null)
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const updateDraft = React.useCallback((patch: Partial<AgendarDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  // Registro fora do plano — draft + fotos compartilhadas entre os passos.
  const [adhoc, setAdhoc] = React.useState<AdhocDraft>(EMPTY_ADHOC);
  const photoDrafts = usePhotoDrafts();

  const updateAdhoc = React.useCallback((patch: Partial<AdhocDraft>) => {
    setAdhoc((prev) => ({ ...prev, ...patch }));
  }, []);

  const isAgendarStepView = agendarStepIndex(view) >= 0;

  // Só pergunta antes de fechar se há algo digitado de fato.
  const draftDirty =
    draft.title.trim() !== "" ||
    draft.category !== null ||
    draft.problemId !== null ||
    draft.branchId !== null ||
    draft.assigneeIds.length > 0 ||
    draft.description !== "" ||
    draft.dueDate !== (defaultDate ?? null);
  const adhocDirty =
    adhoc.description.trim() !== "" ||
    adhoc.category !== null ||
    adhoc.branchId !== null ||
    adhoc.problemChoice !== null ||
    photoDrafts.photos.length > 0;
  const hasDirtyData = isAgendarStepView
    ? draftDirty
    : view === "adhoc"
      ? adhocDirty
      : view === "registrar-complete";

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

  // Abertura direta no concluir (ex.: "Registrar execução" na página da
  // atividade): o contexto do canal chega async — a seleção é DERIVADA
  // do defaultActivityId no render, sem effect. Escolha manual na lista
  // (setSelectedActivity) sempre ganha do default.
  const effectiveSelectedActivity =
    selectedActivity ??
    (defaultActivityId && resolvedChannelCtx
      ? (resolvedChannelCtx.openActivities.find(
          (a) => a.id === defaultActivityId
        ) ?? null)
      : null);

  function handleSetChannel(id: string, name: string) {
    setChannelId(id);
    setChannelName(name);
    if (mode === "agendar") setView("agendar-1");
    else if (mode === "registrar") setView("registrar-pick");
  }

  async function submitAgendar() {
    if (
      !channelId ||
      !draft.title.trim() ||
      draft.category === null ||
      draft.dueDate === null
    ) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const result = await scheduleActivity({
      channelId,
      title: draft.title,
      category: draft.category,
      description: draft.description || undefined,
      problemId: draft.problemId,
      branchId: draft.branchId,
      assigneeIds: draft.assigneeIds,
      dueDate: draft.dueDate,
    });
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    // Avisa superfícies abertas (ex.: calendário) pra destacar a recém-criada.
    window.dispatchEvent(
      new CustomEvent("stoller:activity-created", {
        detail: { id: result.activityId },
      })
    );
    router.refresh();
    // Sucesso vira toast no canto (Sonner discreto): o wizard fecha na
    // hora e o CTA de abrir a atividade vive na notificação.
    handleClose();
    toast.success("Atividade agendada", {
      description: channelName
        ? `${draft.title.trim()} — ${channelName}`
        : draft.title.trim(),
      duration: 6000,
      action: {
        label: "Ver atividade",
        onClick: () => router.push(`/atividades/${result.activityId}`),
      },
    });
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
    setDraft(emptyDraft(defaultDate ?? null));
    setSubmitError(null);
    setSubmitting(false);
    setAdhoc(EMPTY_ADHOC);
    photoDrafts.reset();
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
    selectedActivity: effectiveSelectedActivity,
    draft,
    updateDraft,
    submitting,
    submitError,
    submitAgendar,
    adhoc,
    updateAdhoc,
    photoDrafts,
    setView,
    setMode,
    setChannel: handleSetChannel,
    setSelectedActivity,
    reset: handleReset,
    close: handleClose,
  };

  // Bifurcação no desktop = modal centrado compacto (FIX 1), não painel
  // lateral. Ambos os containers ficam montados (cada um com o próprio
  // open derivado) — trocar de container com open=true não renderiza.
  const bifurcationAsDialog = isDesktop && view === "bifurcation";
  const dialogOpen = open && bifurcationAsDialog;
  const drawerOpen = open && !bifurcationAsDialog;

  return (
    <WizardContext.Provider value={ctx}>
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v && bifurcationAsDialog) tryClose();
        }}
      >
        <DialogContent className="gap-4 sm:max-w-md">
          <DialogTitle className="font-sans! text-base font-semibold">
            O que você quer fazer?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Escolha entre agendar uma atividade ou registrar uma execução
          </DialogDescription>
          <BifurcationOptions />
        </DialogContent>
      </Dialog>
      <Drawer
        open={drawerOpen}
        onOpenChange={(v) => {
          if (!v && !bifurcationAsDialog) tryClose();
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

            {(
              <div className="shrink-0 border-b border-border">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0">
                    <p className="text-base font-semibold">{viewTitle(view)}</p>
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
                {isAgendarStepView && (
                  <WizardStepper
                    steps={AGENDAR_STEPS.map((s) => s.label)}
                    current={agendarStepIndex(view)}
                  />
                )}
              </div>
            )}

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                // Telas com rodapé próprio gerenciam o próprio scroll.
                view === "channel" ||
                  view === "registrar-pick" ||
                  view === "registrar-complete" ||
                  view === "adhoc"
                  ? "overflow-hidden"
                  : "overflow-y-auto"
              )}
            >
              {view === "bifurcation" && <BifurcationStep />}
              {view === "channel" && <ChannelPickerStep channels={channels} />}
              {view === "agendar-1" && <AgendarStep1 />}
              {view === "agendar-2" && <AgendarStep2 />}
              {view === "agendar-3" && <AgendarStep3 />}
              {view === "registrar-pick" && <RegistrarPickStep />}
              {view === "registrar-complete" && <RegistrarCompleteStep />}
              {view === "adhoc" && <AdhocStep />}
            </div>

            {isAgendarStepView && <AgendarFooter />}
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
