"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  ImagePlus,
  Lightbulb,
  Link2,
  Megaphone,
  Presentation,
  Route,
  X,
  type LucideIcon,
} from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ACCEPTED_PHOTO_TYPES,
  MAX_DESCRIPTION,
  PhotoNudgeDrawer,
  SuccessScreen,
  usePhotoDrafts,
} from "./register-shared";

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  reuniao_gerente: Presentation,
  treinamento: GraduationCap,
  rodada_canal: Route,
  geracao_demanda: Megaphone,
};

type ProblemChoice = string | "later" | null;

/** Título do avulso = primeiras palavras (mesma regra do servidor). */
function titlePreview(description: string): string {
  const words = description.trim().split(/\s+/);
  const title = words.slice(0, 8).join(" ");
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

/**
 * Situação B — ação fora do plano: preenche do zero (descrição,
 * categoria, filial opcional, problema quando o plano tem) e nasce como
 * atividade já concluída. Layout 2 col espelhando o P7 pra coerência
 * visual do fluxo Registrar.
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

  const [channelId] = React.useState(initialChannelId);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<ActivityCategory | null>(null);
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

  const branches = React.useMemo(
    () => allBranches.filter((b) => b.channelId === channelId),
    [allBranches, channelId]
  );
  const branchPlans = React.useMemo(() => {
    const ids = new Set(branches.map((b) => b.id));
    return allBranchPlans.filter((bp) => ids.has(bp.branchId));
  }, [allBranchPlans, branches]);

  const planProblems = React.useMemo(() => {
    if (branchId) {
      return branchPlans.find((p) => p.branchId === branchId)?.problems ?? [];
    }
    return branchPlans[0]?.problems ?? [];
  }, [branchId, branchPlans]);

  const problemOk = planProblems.length === 0 || problemChoice !== null;
  const canSubmit =
    description.trim().length > 0 && category !== null && problemOk;

  const currentDateTime = format(new Date(), "dd MMM yyyy · HH:mm", {
    locale: ptBR,
  });

  const disabledHint =
    description.trim().length === 0
      ? "Descreva o que foi feito para registrar."
      : !category
        ? "Escolha o tipo de ação."
        : !problemOk
          ? 'Escolha um problema do plano ou "Vincular depois".'
          : null;

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

  const showTip = photos.length === 0;

  return (
    <PageShell
      title="Registrar ação fora do plano"
      description="A ação vira uma atividade já concluída no plano do canal."
      breadcrumb={
        <div className="mb-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="max-w-52 truncate">
            {activeChannel?.name ?? "Canal"}
          </Badge>
          {channels.length > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmSwitchOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftRight className="size-4" />
              Trocar
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Coluna principal ─────────────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* O que foi feito? */}
          <Card>
            <CardHeader>
              <CardTitle>O que foi feito?</CardTitle>
              <CardDescription>
                Uma frase curta descrevendo a ação — vira o título da
                atividade.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Textarea
                value={description}
                maxLength={MAX_DESCRIPTION}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex: Dia de campo sobre biológicos com 18 produtores na filial Sorriso"
                className="min-h-24 text-base"
              />
              <span className="self-end text-xs text-muted-foreground tabular-nums">
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </CardContent>
          </Card>

          {/* Tipo de ação */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de ação</CardTitle>
              <CardDescription>
                Escolha a categoria que melhor representa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                        "flex min-h-16 items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "bg-card text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-6 shrink-0",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="leading-tight">
                        {CATEGORY_LABELS[item]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Onde foi? */}
          {branches.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Onde foi?</CardTitle>
                <CardDescription>
                  Selecione o local (opcional).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBranchId(null);
                      setProblemChoice(null);
                    }}
                    className={cn(
                      "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
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
                        "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                        branchId === branch.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {branch.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Problema — só se plano tem problemas */}
          {planProblems.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>A qual problema essa ação responde?</CardTitle>
                <CardDescription>
                  Vincular a um problema fortalece o relatório de safra.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {planProblems.map((problem) => {
                    const active = problemChoice === problem.id;
                    return (
                      <button
                        key={problem.id}
                        type="button"
                        onClick={() => setProblemChoice(problem.id)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/10"
                            : "bg-card hover:bg-muted/60"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                            active
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/50"
                          )}
                        >
                          {active ? (
                            <span className="size-1.5 rounded-full bg-primary-foreground" />
                          ) : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "line-clamp-1 text-sm font-medium leading-snug",
                              active && "text-primary"
                            )}
                          >
                            {problem.title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setProblemChoice("later")}
                    aria-pressed={problemChoice === "later"}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border-2 border-dashed p-4 text-left transition-colors",
                      problemChoice === "later"
                        ? "border-primary/60 bg-primary/5"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Link2 className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        Vincular depois
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fica como pendência para o DSM ajustar.
                      </p>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Fotos */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
              <CardDescription>
                Anexe evidências da ação (opcional).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_PHOTO_TYPES.join(",")}
                capture="environment"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  addFiles(files);
                }}
              />

              {photos.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-primary transition-colors hover:bg-primary/10 active:bg-primary/15"
                  >
                    <Camera className="size-8" />
                    <span className="text-sm font-semibold">
                      Adicionar foto
                    </span>
                  </button>
                  <p className="text-center text-xs text-muted-foreground">
                    Você pode adicionar várias fotos.
                  </p>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square overflow-hidden rounded-xl border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt="Foto da execução"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        aria-label="Remover foto"
                        className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-white active:bg-black/80"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Adicionar mais fotos"
                    className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground hover:bg-muted/60"
                  >
                    <ImagePlus className="size-6" />
                  </button>
                </div>
              )}
              {rejected ? (
                <p className="text-xs text-destructive" role="alert">
                  Alguma foto foi ignorada: use JPG, PNG ou WEBP até 10MB.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {error ? (
            <div
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        {/* ── Coluna lateral ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Registrar ação concluída</CardTitle>
              <CardDescription>
                Data e hora capturadas automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Registro</p>
                <p className="font-medium tabular-nums">{currentDateTime}</p>
              </div>
              <Button
                size="lg"
                className="h-12 w-full text-base disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
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
                    <CheckCircle2 className="size-5" />
                    Registrar ação concluída
                  </>
                )}
              </Button>
              {disabledHint ? (
                <p className="text-center text-xs text-muted-foreground">
                  {disabledHint}
                </p>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground"
                disabled={submitting}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>

          {showTip ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex items-start gap-3 py-4">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-muted-foreground">
                  Uma foto fortalece o registro nas reuniões com o canal.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Botão sticky no rodapé mobile */}
      <div className="sticky bottom-0 -mx-5 mt-2 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:-mx-8 lg:hidden">
        <Button
          size="lg"
          className="h-12 w-full text-base disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
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
              <CheckCircle2 className="size-5" />
              Registrar ação concluída
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

      {/* Confirmação de troca de canal — perde tudo preenchido */}
      <AlertDialog
        open={confirmSwitchOpen}
        onOpenChange={setConfirmSwitchOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar canal?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações preenchidas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onBack}>
              Trocar canal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
