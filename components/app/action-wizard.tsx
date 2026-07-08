"use client";

import * as React from "react";
import {
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Store,
  X,
} from "lucide-react";

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
import { cn } from "@/lib/utils";
import type { ChannelOption } from "@/lib/db/execution";

// ── Types ──────────────────────────────────────────────────────────────

export type WizardMode = "agendar" | "registrar";

type WizardStep = {
  id: string;
  title: string;
  component: React.ReactNode;
};

export type ActionWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: ChannelOption[];
  defaultChannelId?: string | null;
  defaultDate?: string | null;
  defaultMode?: WizardMode | null;
};

// ── Internal context ───────────────────────────────────────────────────

type WizardCtx = {
  mode: WizardMode | null;
  channelId: string | null;
  channelName: string | null;
  date: string | null;
  setMode: (m: WizardMode) => void;
  setChannel: (id: string, name: string) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  close: () => void;
  hasDirtyData: boolean;
  setHasDirtyData: (v: boolean) => void;
};

const WizardContext = React.createContext<WizardCtx | null>(null);

export function useActionWizard() {
  const ctx = React.useContext(WizardContext);
  if (!ctx) throw new Error("useActionWizard must be used inside ActionWizard");
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

// ── Step 0: Bifurcation ────────────────────────────────────────────────

function BifurcationStep() {
  const { setMode, next } = useActionWizard();

  function pick(mode: WizardMode) {
    setMode(mode);
    next();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h3 className="text-lg font-semibold">O que você quer fazer?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha como deseja registrar sua ação.
        </p>
      </div>
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

// ── Channel picker step ────────────────────────────────────────────────

function ChannelPickerStep({ channels }: { channels: ChannelOption[] }) {
  const { setChannel, next } = useActionWizard();

  function pick(ch: ChannelOption) {
    setChannel(ch.id, ch.name);
    next();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h3 className="text-lg font-semibold">Selecione o canal</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o canal onde a ação será registrada.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {channels.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => pick(ch)}
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
    </div>
  );
}

// ── Placeholder step ───────────────────────────────────────────────────

function PlaceholderStep({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
          <Calendar className="size-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Este passo será implementado em breve.
        </p>
      </div>
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────

function SuccessScreen() {
  const { mode, reset, close } = useActionWizard();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
        <Check className="size-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="text-center">
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
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Fazer outro
        </Button>
        <Button onClick={close}>Fechar</Button>
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────

function StepProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = total > 1 ? (current / (total - 1)) * 100 : 100;
  return (
    <div className="h-1 w-full bg-muted">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${pct}%` }}
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
  defaultDate,
  defaultMode,
}: ActionWizardProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [mode, setMode] = React.useState<WizardMode | null>(
    defaultMode ?? null
  );
  const [channelId, setChannelId] = React.useState<string | null>(
    defaultChannelId ?? null
  );
  const [channelName, setChannelName] = React.useState<string | null>(() => {
    if (defaultChannelId) {
      const ch = channels.find((c) => c.id === defaultChannelId);
      return ch?.name ?? null;
    }
    return null;
  });
  const [date] = React.useState<string | null>(defaultDate ?? null);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [hasDirtyData, setHasDirtyData] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const hasDefaultMode = defaultMode != null;
  const hasDefaultChannel = defaultChannelId != null;
  const needsChannelPicker = !hasDefaultChannel && channels.length > 1;

  const steps = React.useMemo<WizardStep[]>(() => {
    const list: WizardStep[] = [];

    if (!hasDefaultMode) {
      list.push({
        id: "bifurcation",
        title: "O que você quer fazer?",
        component: <BifurcationStep />,
      });
    }

    if (needsChannelPicker) {
      list.push({
        id: "channel",
        title: "Selecione o canal",
        component: <ChannelPickerStep channels={channels} />,
      });
    }

    if (mode === "agendar") {
      list.push({
        id: "agendar-detalhes",
        title: "Detalhes da atividade",
        component: <PlaceholderStep label="Detalhes do agendamento" />,
      });
      list.push({
        id: "agendar-confirmar",
        title: "Confirmar",
        component: <PlaceholderStep label="Confirmação do agendamento" />,
      });
    } else if (mode === "registrar") {
      list.push({
        id: "registrar-detalhes",
        title: "Detalhes da execução",
        component: <PlaceholderStep label="Detalhes do registro" />,
      });
      list.push({
        id: "registrar-confirmar",
        title: "Confirmar",
        component: <PlaceholderStep label="Confirmação do registro" />,
      });
    }

    list.push({
      id: "success",
      title: "Concluído",
      component: <SuccessScreen />,
    });

    return list;
  }, [hasDefaultMode, needsChannelPicker, channels, mode]);

  const currentStep = steps[stepIndex];
  const isSuccess = currentStep?.id === "success";
  const isFirstStep = stepIndex === 0;
  const isLastBeforeSuccess =
    stepIndex === steps.length - 2 && !isSuccess;

  function handleNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  }

  function handleReset() {
    setMode(defaultMode ?? null);
    setChannelId(defaultChannelId ?? null);
    setChannelName(() => {
      if (defaultChannelId) {
        const ch = channels.find((c) => c.id === defaultChannelId);
        return ch?.name ?? null;
      }
      return null;
    });
    setStepIndex(0);
    setHasDirtyData(false);
  }

  function handleClose() {
    onOpenChange(false);
  }

  function tryClose() {
    if (hasDirtyData && !isSuccess) {
      setShowConfirm(true);
    } else {
      handleClose();
    }
  }

  function handleSetChannel(id: string, name: string) {
    setChannelId(id);
    setChannelName(name);
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
    channelId,
    channelName,
    date,
    setMode,
    setChannel: handleSetChannel,
    next: handleNext,
    back: handleBack,
    reset: handleReset,
    close: handleClose,
    hasDirtyData,
    setHasDirtyData,
  };

  const showFooter =
    !isSuccess &&
    currentStep?.id !== "bifurcation" &&
    currentStep?.id !== "channel";

  return (
    <WizardContext.Provider value={ctx}>
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            tryClose();
          } else {
            onOpenChange(true);
          }
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
          {/* Accessible title (visually hidden in favor of step title) */}
          <DrawerTitle className="sr-only">
            {mode === "agendar"
              ? "Agendar atividade"
              : mode === "registrar"
                ? "Registrar execução"
                : "Nova ação"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Wizard para criar ou registrar atividades
          </DrawerDescription>

          {/* Progress bar */}
          {!isSuccess && (
            <StepProgress current={stepIndex} total={steps.length - 1} />
          )}

          {/* Header */}
          {!isSuccess && (
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="min-w-0">
                <p className="font-medium">{currentStep?.title}</p>
                {channelName && currentStep?.id !== "channel" && currentStep?.id !== "bifurcation" && (
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

          {/* Step content */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {currentStep?.component}
          </div>

          {/* Footer with nav buttons */}
          {showFooter && (
            <div className="flex items-center justify-between border-t px-6 py-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={isFirstStep}
              >
                Voltar
              </Button>
              <Button onClick={handleNext}>
                {isLastBeforeSuccess ? "Concluir" : "Continuar"}
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Confirm close dialog */}
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
