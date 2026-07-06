"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  ImagePlus,
  Search,
  SearchX,
  X,
} from "lucide-react";

import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { registerExecution } from "@/lib/actions/execution";
import type { BranchOption, FieldActivity } from "@/lib/db/execution";
import { formatRelativeDue } from "@/lib/plan-utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Wizard mobile-first do registro de execução (375px primeiro).
 * Filosofia: foto primeiro, burocracia depois — registro completo em
 * até 4 toques com deep link (?atividade=id pula o passo 2).
 * Resiliência de campo: nada se perde em falha de upload; fotos já
 * enviadas não sobem de novo no "Tentar de novo".
 */

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB antes da compressão
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_DESCRIPTION = 500;

type PhotoDraft = {
  id: string;
  file: File;
  url: string;
};

type SuccessData = {
  activityId: string;
  activityTitle: string;
  photoCount: number;
  completed: boolean;
};

/** Reduz a imagem no client (máx. 1600px, JPEG q0.8) antes do upload. */
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

/** Caminho único no bucket para a foto comprimida. */
function buildStoragePath(extension: string): string {
  return `execucoes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

/** Mesma regra do servidor: título do avulso = primeiras palavras. */
function titlePreview(description: string): string {
  const words = description.trim().split(/\s+/);
  const title = words.slice(0, 8).join(" ");
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

const STEP_LABELS: Record<number, string> = {
  1: "Evidência",
  2: "Vincular à atividade",
  3: "Confirmar",
};

export function RegisterFlow({
  activities,
  branches,
  preselectedId,
}: {
  activities: FieldActivity[];
  branches: BranchOption[];
  preselectedId: string | null;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const uploadedRef = React.useRef(new Map<string, string>());

  const [step, setStep] = React.useState(1);
  const [done, setDone] = React.useState<SuccessData | null>(null);

  // Passo 1
  const [photos, setPhotos] = React.useState<PhotoDraft[]>([]);
  const [description, setDescription] = React.useState("");

  // Passo 2
  const [search, setSearch] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<FieldActivity | null>(
    () => activities.find((activity) => activity.id === preselectedId) ?? null
  );
  const [adhoc, setAdhoc] = React.useState(false);
  const deepLinked = selected !== null;

  // Passo 3
  const [adhocBranchId, setAdhocBranchId] = React.useState<string | null>(
    branches.length === 1 ? branches[0].id : null
  );
  const [markCompleted, setMarkCompleted] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const descriptionOk = description.trim().length > 0;

  function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const accepted = files.filter(
      (file) => ACCEPTED.includes(file.type) && file.size <= MAX_PHOTO_SIZE
    );
    if (accepted.length < files.length) {
      setError("Alguma foto foi ignorada: use JPG, PNG ou WEBP até 10MB.");
    }
    setPhotos((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return current.filter((item) => item.id !== id);
    });
    uploadedRef.current.delete(id);
  }

  function goNextFromStep1() {
    setError(null);
    // Deep link: atividade já escolhida → pula direto pro confirmar.
    setStep(selected && deepLinked ? 3 : 2);
  }

  function pickActivity(activity: FieldActivity) {
    setSelected(activity);
    setAdhoc(false);
    setError(null);
    setStep(3);
  }

  function pickAdhoc() {
    setSelected(null);
    setAdhoc(true);
    setError(null);
    if (branchFilter) setAdhocBranchId(branchFilter);
    setStep(3);
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  function resetAll() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    uploadedRef.current.clear();
    setPhotos([]);
    setDescription("");
    setSearch("");
    setBranchFilter(null);
    setSelected(null);
    setAdhoc(false);
    setAdhocBranchId(branches.length === 1 ? branches[0].id : null);
    setMarkCompleted(true);
    setError(null);
    setDone(null);
    setStep(1);
  }

  async function handleSubmit() {
    if (adhoc && !adhocBranchId) {
      setError("Escolha a filial onde a ação aconteceu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const paths: string[] = [];
      for (const photo of photos) {
        const already = uploadedRef.current.get(photo.id);
        if (already) {
          paths.push(already);
          continue;
        }
        const blob = await compressImage(photo.file);
        const extension = blob.type === "image/jpeg" ? "jpg" : (photo.file.name.split(".").pop() ?? "jpg");
        const path = buildStoragePath(extension);
        const { error: uploadError } = await supabase.storage
          .from("activity-photos")
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (uploadError) {
          throw new Error("upload");
        }
        uploadedRef.current.set(photo.id, path);
        paths.push(path);
      }

      const result = await registerExecution({
        activityId: adhoc ? undefined : selected?.id,
        adhocBranchId: adhoc ? (adhocBranchId ?? undefined) : undefined,
        description,
        markCompleted: adhoc ? true : markCompleted,
        photoPaths: paths,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone({
        activityId: result.activityId,
        activityTitle: selected?.title ?? titlePreview(description),
        photoCount: photos.length,
        completed: result.completed,
      });
    } catch {
      setError(
        "Falha ao enviar as fotos — sinal fraco? Nada foi perdido, tente de novo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Tela de sucesso — a recompensa ──────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-[#96CB40]/15 duration-500 animate-in zoom-in-50 fade-in">
          <div className="flex size-16 items-center justify-center rounded-full bg-[#96CB40] delay-150 duration-500 animate-in zoom-in-50 fill-mode-backwards">
            <Check className="size-9 text-white" strokeWidth={3} />
          </div>
        </div>
        <div className="space-y-2 delay-200 duration-500 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards">
          <h1 className="text-2xl font-semibold tracking-tight">
            Registro feito!
          </h1>
          <p className="text-sm text-muted-foreground">
            {done.activityTitle}
            {done.photoCount > 0
              ? ` · ${done.photoCount} ${done.photoCount === 1 ? "foto" : "fotos"}`
              : " · sem fotos"}
          </p>
          {done.completed ? (
            <p className="text-sm font-medium text-[#4A7A10] dark:text-[#B5DC73]">
              Atividade marcada como concluída
            </p>
          ) : null}
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2 delay-300 duration-500 animate-in fade-in fill-mode-backwards">
          <Button size="lg" className="h-12 text-base" onClick={resetAll}>
            <Camera className="size-5" />
            Registrar outra
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 text-base"
            nativeButton={false}
            render={
              <Link href="/minhas-atividades">Ver minhas atividades</Link>
            }
          />
        </div>
      </div>
    );
  }

  const filteredActivities = activities.filter((activity) => {
    if (branchFilter && activity.branchId !== branchFilter) return false;
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return (
      activity.title.toLowerCase().includes(query) ||
      (activity.branchName ?? "").toLowerCase().includes(query) ||
      activity.channelName.toLowerCase().includes(query)
    );
  });

  const summaryBranchName = adhoc
    ? (branches.find((branch) => branch.id === adhocBranchId)?.name ?? null)
    : (selected?.branchName ?? null);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      {/* Barra de progresso fina no topo */}
      <div
        className="h-1 w-full shrink-0 bg-muted"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={3}
        aria-label={`Passo ${step} de 3`}
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <header className="flex items-center gap-2 px-4 py-3">
        {step > 1 ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            onClick={goBack}
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </Button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-semibold tracking-tight">
            Registrar execução
          </h1>
          <p className="text-xs text-muted-foreground">
            Passo <span className="tabular-nums">{step}</span> de 3 —{" "}
            {STEP_LABELS[step]}
          </p>
        </div>
      </header>

      {/* ─── Passo 1 — Evidência ──────────────────────────────────────── */}
      {step === 1 ? (
        <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            className="hidden"
            onChange={addPhotos}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-primary transition-colors hover:bg-primary/10 active:bg-primary/15"
          >
            <Camera className="size-9" />
            <span className="text-base font-semibold">
              Tirar ou escolher foto
            </span>
            <span className="text-xs text-muted-foreground">
              A evidência vale mais que mil relatórios
            </span>
          </button>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
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
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="descricao" className="text-sm font-medium">
              O que foi feito?
            </label>
            <Textarea
              id="descricao"
              value={description}
              maxLength={MAX_DESCRIPTION}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex: Dia de campo sobre biológicos com 18 produtores na filial Sorriso"
              className="min-h-32 text-base"
            />
            <span className="self-end text-xs text-muted-foreground tabular-nums">
              {description.length}/{MAX_DESCRIPTION}
            </span>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="sticky bottom-0 z-10 mt-auto -mx-4 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <Button
              size="lg"
              className="h-12 w-full text-base"
              disabled={!descriptionOk}
              onClick={goNextFromStep1}
            >
              Continuar
              <ChevronRight className="size-5" />
            </Button>
            {!descriptionOk ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Descreva o que foi feito para continuar — a foto é opcional.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ─── Passo 2 — Vincular à atividade ───────────────────────────── */}
      {step === 2 ? (
        <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar atividade..."
              className="h-11 pl-9"
              aria-label="Buscar atividade"
            />
          </div>

          {branches.length > 1 ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <button
                type="button"
                onClick={() => setBranchFilter(null)}
                className={cn(
                  "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                  branchFilter === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                Todas
              </button>
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() =>
                    setBranchFilter((current) =>
                      current === branch.id ? null : branch.id
                    )
                  }
                  className={cn(
                    "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                    branchFilter === branch.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {branch.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {filteredActivities.length === 0 ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchX />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma atividade aberta</EmptyTitle>
                  <EmptyDescription>
                    Nada encontrado no recorte atual — você ainda pode criar
                    um registro avulso abaixo.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              filteredActivities.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => pickActivity(activity)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="line-clamp-2 leading-snug font-medium">
                      {activity.title}
                      {activity.isMine ? (
                        <span className="ml-1.5 align-middle text-[10px] font-semibold text-primary uppercase">
                          minha
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {activity.branchName ?? "Sem filial"} ·{" "}
                      {formatRelativeDue(activity.dueDate)}
                    </p>
                  </div>
                  <StatusBadge status={activity.status} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}

            <button
              type="button"
              onClick={pickAdhoc}
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left text-muted-foreground transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <ClipboardList className="size-5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-medium text-foreground">
                  Não está no plano — criar registro avulso
                </p>
                <p className="text-sm">
                  A ação vira uma atividade concluída fora do plano.
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── Passo 3 — Confirmar ──────────────────────────────────────── */}
      {step === 3 ? (
        <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <Card className="py-4">
            <CardContent className="flex flex-col gap-4 px-4">
              {photos.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto">
                  {photos.map((photo) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt="Foto da execução"
                      className="size-16 shrink-0 rounded-lg border object-cover"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem fotos — só a descrição será registrada.
                </p>
              )}

              <p className="text-sm leading-relaxed">{description}</p>

              <dl className="grid gap-3 border-t pt-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Atividade</dt>
                  <dd className="text-right font-medium">
                    {adhoc ? (
                      <>
                        {titlePreview(description)}
                        <span className="block text-xs font-normal text-muted-foreground">
                          Registro avulso — fora do plano
                        </span>
                      </>
                    ) : (
                      selected?.title
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Filial</dt>
                  <dd className="font-medium">{summaryBranchName ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="font-medium tabular-nums">
                    {format(new Date(), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {adhoc && branches.length > 1 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Em qual filial foi a ação?
              </p>
              <div className="flex flex-wrap gap-2">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setAdhocBranchId(branch.id)}
                    className={cn(
                      "h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                      adhocBranchId === branch.id
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

          {adhoc ? (
            <p className="text-sm text-muted-foreground">
              O registro avulso já entra como{" "}
              <span className="font-medium text-foreground">concluído</span> e
              pode ser lapidado depois pelo DSM.
            </p>
          ) : (
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-card p-3">
              <span className="text-sm font-medium">
                Marcar atividade como concluída
              </span>
              <Switch
                checked={markCompleted}
                onCheckedChange={setMarkCompleted}
                aria-label="Marcar atividade como concluída"
              />
            </label>
          )}

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
              disabled={submitting || (adhoc && !adhocBranchId)}
              onClick={handleSubmit}
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
                  Registrar
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
