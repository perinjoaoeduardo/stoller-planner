"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  GraduationCap,
  LinkIcon,
  Megaphone,
  Presentation,
  Route,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { registerExecution } from "@/lib/actions/execution";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/config";
import type {
  BranchOption,
  BranchPlanInfo,
  ChannelOption,
} from "@/lib/db/execution";
import { cn } from "@/lib/utils";

import {
  MAX_DESCRIPTION,
  PhotoNudgeDrawer,
  PhotoSection,
  SuccessScreen,
  usePhotoDrafts,
} from "./register-shared";

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  reuniao_gerente: Presentation,
  treinamento: GraduationCap,
  rodada_canal: Route,
  geracao_demanda: Megaphone,
};

/** Escolha de problema: id do problema ou "later" = vincular depois. */
type ProblemChoice = string | "later" | null;

/** Mesma regra do servidor: título do avulso = primeiras palavras. */
function titlePreview(description: string): string {
  const words = description.trim().split(/\s+/);
  const title = words.slice(0, 8).join(" ");
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

/**
 * Situação B — ação fora do plano: preenche do zero (descrição,
 * categoria em 4 botões grandes, problema quando o plano tem, filial
 * opcional — "Canal geral" é o padrão) e nasce como atividade concluída.
 * Canal é sempre exibido; RTVs com múltiplos canais podem trocar direto
 * no formulário via Popover sem perder o que já preencheram.
 */
export function AdhocForm({
  allBranches,
  allBranchPlans,
  channels,
  initialChannelId,
  onBack,
}: {
  allBranches: BranchOption[];
  allBranchPlans: BranchPlanInfo[];
  channels: ChannelOption[];
  initialChannelId: string;
  onBack: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { photos, rejected, addFiles, removePhoto, reset, uploadAll } =
    usePhotoDrafts();

  const [channelId, setChannelId] = React.useState(initialChannelId);
  const [channelPickerOpen, setChannelPickerOpen] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<ActivityCategory | null>(null);
  // null = "Canal geral" (padrão); id de filial = filial específica
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [problemChoice, setProblemChoice] = React.useState<ProblemChoice>(null);
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ photoCount: number } | null>(null);

  const activeChannel = React.useMemo(
    () => channels.find((c) => c.id === channelId) ?? channels[0],
    [channels, channelId]
  );

  // Filiais e planos do canal atual
  const branches = React.useMemo(
    () => allBranches.filter((b) => b.channelId === channelId),
    [allBranches, channelId]
  );
  const branchPlans = React.useMemo(() => {
    const ids = new Set(branches.map((b) => b.id));
    return allBranchPlans.filter((bp) => ids.has(bp.branchId));
  }, [allBranchPlans, branches]);

  // Problemas: do branchPlan da filial selecionada ou do primeiro disponível
  // (todas as filiais do canal compartilham o mesmo plano).
  const planProblems = React.useMemo(() => {
    if (branchId) {
      return branchPlans.find((p) => p.branchId === branchId)?.problems ?? [];
    }
    return branchPlans[0]?.problems ?? [];
  }, [branchId, branchPlans]);

  const problemOk = planProblems.length === 0 || problemChoice !== null;
  const canSubmit = description.trim().length > 0 && category !== null && problemOk;

  function handleChannelChange(newId: string) {
    setChannelId(newId);
    setBranchId(null);
    setProblemChoice(null);
    setChannelPickerOpen(false);
  }

  async function submit() {
    if (!canSubmit || !category) return;
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
      setDone({ photoCount: photos.length });
    } catch {
      setError(
        "Falha ao enviar as fotos — sinal fraco? Nada foi perdido, tente de novo."
      );
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

  function resetAll() {
    reset();
    setDescription("");
    setCategory(null);
    setBranchId(null);
    setProblemChoice(null);
    setError(null);
    setDone(null);
  }

  if (done) {
    return (
      <SuccessScreen
        title={titlePreview(description)}
        photoCount={done.photoCount}
        completed
        onRegisterAnother={resetAll}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <header className="flex items-center gap-2 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          onClick={onBack}
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          {/* Canal — sempre visível; clicável quando RTV tem 2+ canais */}
          <div className="mb-1">
            {channels.length > 1 ? (
              <Popover
                open={channelPickerOpen}
                onOpenChange={setChannelPickerOpen}
              >
                <PopoverTrigger className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70">
                  {activeChannel.name}
                  <ChevronDown className="size-3" />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-56 gap-1 p-1.5"
                >
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleChannelChange(ch.id)}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                        ch.id === channelId &&
                          "bg-primary/10 font-medium text-primary"
                      )}
                    >
                      {ch.name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            ) : (
              <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                {activeChannel.name}
              </span>
            )}
          </div>
          <h1 className="text-lg leading-tight font-semibold tracking-tight">
            Registrar ação fora do plano
          </h1>
          <p className="text-xs text-muted-foreground">
            A ação vira uma atividade já concluída no plano do canal.
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
        {/* Descrição — obrigatória */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="descricao-avulsa" className="text-sm font-medium">
            O que foi feito?
          </label>
          <Textarea
            id="descricao-avulsa"
            value={description}
            maxLength={MAX_DESCRIPTION}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex: Dia de campo sobre biológicos com 18 produtores na filial Sorriso"
            className="min-h-24 text-base"
          />
          <span className="self-end text-xs text-muted-foreground tabular-nums">
            {description.length}/{MAX_DESCRIPTION}
          </span>
        </div>

        {/* Categoria — obrigatória, 4 botões grandes */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Qual o tipo da ação?</p>
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
                    "flex min-h-16 flex-col items-start justify-center gap-1 rounded-xl border p-3 text-left text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-5" />
                  <span className="leading-tight">{CATEGORY_LABELS[item]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filial — opcional; some completamente quando canal não tem filiais */}
        {branches.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Em qual local foi a ação?</p>
            <div className="flex flex-wrap gap-2">
              {/* Canal geral: opção neutra, sempre primeiro */}
              <button
                type="button"
                onClick={() => {
                  setBranchId(null);
                  setProblemChoice(null);
                }}
                className={cn(
                  "h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                  branchId === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-muted/50"
                )}
              >
                Canal geral
              </button>
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    setBranchId(branch.id);
                    setProblemChoice(null);
                  }}
                  className={cn(
                    "h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                    branchId === branch.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {branch.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Problema — só quando o plano do canal tem problemas */}
        {planProblems.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              Qual problema do plano essa ação ataca?
            </p>
            <div className="flex flex-col gap-2">
              {planProblems.map((problem) => (
                <button
                  key={problem.id}
                  type="button"
                  onClick={() => setProblemChoice(problem.id)}
                  aria-pressed={problemChoice === problem.id}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-medium transition-colors",
                    problemChoice === problem.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-card hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      problemChoice === problem.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-transparent"
                    )}
                  >
                    <Check className="size-3.5" />
                  </span>
                  <span className="leading-snug">{problem.title}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setProblemChoice("later")}
                aria-pressed={problemChoice === "later"}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left text-sm transition-colors",
                  problemChoice === "later"
                    ? "border-primary/60 bg-primary/5 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <LinkIcon className="size-4 shrink-0" />
                <span>
                  Vincular depois
                  <span className="block text-xs text-muted-foreground">
                    Fica como pendência para ajustar na tabela ou no detalhe.
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Foto — opcional, com o mesmo nudge da Situação A */}
        <PhotoSection
          photos={photos}
          rejected={rejected}
          onAdd={addFiles}
          onRemove={removePhoto}
          inputRef={fileRef}
        />

        {error ? (
          <div
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="sticky bottom-0 z-10 mt-auto -mx-4 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <Button
            size="lg"
            className="h-12 w-full text-base"
            disabled={submitting || !canSubmit}
            onClick={handleRegister}
          >
            {submitting ? (
              <>
                <Spinner />
                Registrando...
              </>
            ) : error ? (
              "Tentar de novo"
            ) : (
              <>
                <Check className="size-5" />
                Registrar ação concluída
              </>
            )}
          </Button>
          {!canSubmit ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {description.trim().length === 0
                ? "Descreva o que foi feito para registrar."
                : !category
                  ? "Escolha o tipo da ação."
                  : 'Escolha um problema do plano ou "Vincular depois".'}
            </p>
          ) : null}
        </div>
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
