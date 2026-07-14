"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarClock,
  Camera,
  CheckCircle2,
  CircleAlert,
  ImagePlus,
  Lightbulb,
  MapPin,
  Store,
  Users,
  X,
} from "lucide-react";

import { CategoryBadge } from "@/components/app/category-badge";
import { PageShell } from "@/components/app/page-shell";
import { StatusBadge } from "@/components/shared/status-badge";
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
import type { FieldActivity } from "@/lib/db/execution";
import { formatRelativeDue } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";

import {
  ACCEPTED_PHOTO_TYPES,
  MAX_DESCRIPTION,
  PhotoNudgeDrawer,
  SuccessScreen,
  usePhotoDrafts,
} from "./register-shared";

/**
 * Situação A — a atividade planejada já existe: o RTV abre, anexa foto
 * (opcional) e conclui. Tudo já vem do plano: título, categoria,
 * problema, filial, responsáveis. O caminho feliz é 1 toque + foto.
 */
export function CompleteActivity({
  activity,
  onBack,
  onDone,
}: {
  activity: FieldActivity;
  onBack: (() => void) | null;
  onDone: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { photos, rejected, addFiles, removePhoto, uploadAll } =
    usePhotoDrafts();

  const [description, setDescription] = React.useState("");
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const overdue = activity.status === "atrasada";

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
      setDone(true);
    } catch {
      setError(
        "Falha ao enviar as fotos — sinal fraco? Nada foi perdido, tente de novo."
      );
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

  if (done) {
    return (
      <SuccessScreen
        title={activity.title}
        photoCount={photos.length}
        completed
        onRegisterAnother={onDone}
      />
    );
  }

  const currentDateTime = format(new Date(), "dd MMM yyyy · HH:mm", {
    locale: ptBR,
  });

  const showTip = photos.length === 0 && description.trim().length === 0;

  const MetaRow = ({
    icon: Icon,
    label,
    children,
  }: {
    icon: typeof MapPin;
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-start gap-3 min-w-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="min-w-0 text-sm font-medium">{children}</div>
      </div>
    </div>
  );

  return (
    <PageShell
      title="Concluir atividade"
      description="Anexe uma evidência e confirme a execução."
      onBack={onBack ?? undefined}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Coluna principal ─────────────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Card: Atividade (read-only) */}
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-2">
                <p className="text-lg font-medium leading-snug">
                  {activity.title}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={activity.status} />
                  {activity.category ? (
                    <CategoryBadge category={activity.category} />
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
                <MetaRow icon={Store} label="Canal">
                  {activity.channelName}
                </MetaRow>
                <MetaRow icon={MapPin} label="Local">
                  {activity.branchName ?? (
                    <span className="text-muted-foreground">Canal geral</span>
                  )}
                </MetaRow>
                <MetaRow icon={CalendarClock} label="Prazo">
                  <span
                    className={cn(
                      overdue &&
                        "font-medium text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatRelativeDue(activity.dueDate)}
                  </span>
                </MetaRow>
                <MetaRow icon={Users} label="Responsáveis">
                  <span>
                    {activity.assigneeIds.length > 0
                      ? `${activity.assigneeIds.length} ${activity.assigneeIds.length === 1 ? "responsável" : "responsáveis"}${activity.isMine ? " · você inclusive" : ""}`
                      : "Sem responsável"}
                  </span>
                </MetaRow>
                {activity.problemTitle ? (
                  <MetaRow icon={CheckCircle2} label="Meta do plano">
                    {activity.problemTitle}
                  </MetaRow>
                ) : activity.planProblemCount > 0 ? (
                  <MetaRow icon={CheckCircle2} label="Meta do plano">
                    <span className="text-muted-foreground">
                      Sem vínculo (você pode vincular depois na página da
                      atividade)
                    </span>
                  </MetaRow>
                ) : null}
              </div>

              {activity.description ? (
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Descrição planejada
                  </p>
                  <p className="mt-1 text-sm leading-relaxed line-clamp-3">
                    {activity.description}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Card: Descrição da execução (opcional) */}
          <Card>
            <CardHeader>
              <CardTitle>O que aconteceu?</CardTitle>
              <CardDescription>
                Adicione detalhes se a execução foi diferente do planejado
                (opcional).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Textarea
                value={description}
                maxLength={MAX_DESCRIPTION}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex: reunião aconteceu com 5 pessoas em vez de 3 previstas; focamos em fungicidas premium."
                className="min-h-24 text-base"
              />
              <span className="self-end text-xs text-muted-foreground tabular-nums">
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </CardContent>
          </Card>

          {/* Card: Evidências (fotos) */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
              <CardDescription>
                Anexe fotos da execução (opcional).
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
                        className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-foreground/60 text-white active:bg-foreground/80"
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
              <CardTitle>Registrar como concluída</CardTitle>
              <CardDescription>
                Data e hora do registro são capturadas automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Registro</p>
                <p className="font-medium tabular-nums">{currentDateTime}</p>
              </div>
              <Button
                size="lg"
                className="h-12 w-full text-base"
                disabled={submitting}
                onClick={handleConclude}
              >
                {submitting ? (
                  <>
                    <Spinner />
                    Concluindo...
                  </>
                ) : error ? (
                  "Tentar de novo"
                ) : (
                  <>
                    <CheckCircle2 className="size-5" />
                    Concluir atividade
                  </>
                )}
              </Button>
              {onBack ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-muted-foreground"
                  disabled={submitting}
                >
                  Cancelar
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {showTip ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex items-start gap-3 py-4">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-muted-foreground">
                  Uma foto e um comentário curto ajudam nas reuniões com o
                  canal.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Botão sticky no rodapé apenas no mobile */}
      <div className="sticky bottom-0 -mx-5 mt-2 border-t bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:-mx-8 lg:hidden">
        <Button
          size="lg"
          className="h-12 w-full text-base"
          disabled={submitting}
          onClick={handleConclude}
        >
          {submitting ? (
            <>
              <Spinner />
              Concluindo...
            </>
          ) : error ? (
            "Tentar de novo"
          ) : (
            <>
              <CheckCircle2 className="size-5" />
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
    </PageShell>
  );
}
