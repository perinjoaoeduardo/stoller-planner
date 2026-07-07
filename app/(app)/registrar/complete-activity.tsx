"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, CircleAlert, Pencil } from "lucide-react";

import { CategoryBadge } from "@/components/app/category-badge";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { registerExecution } from "@/lib/actions/execution";
import type { FieldActivity } from "@/lib/db/execution";
import { formatRelativeDue } from "@/lib/plan-utils";

import {
  MAX_DESCRIPTION,
  PhotoNudgeDrawer,
  PhotoSection,
  SuccessScreen,
  usePhotoDrafts,
} from "./register-shared";

/**
 * Situação A — a atividade planejada já existe: abrir, anexar a foto
 * por cima e marcar como concluída. Tudo já vem preenchido do plano;
 * o caminho feliz é 1 toque ("Marcar como concluída") + foto opcional.
 */
export function CompleteActivity({
  activity,
  onBack,
  onDone,
}: {
  activity: FieldActivity;
  /** Voltar para a lista (null = veio por deep link, volta pro histórico). */
  onBack: (() => void) | null;
  onDone: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { photos, rejected, addFiles, removePhoto, uploadAll } =
    usePhotoDrafts();

  const [editingDescription, setEditingDescription] = React.useState(false);
  const [description, setDescription] = React.useState(
    activity.description ?? ""
  );
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const paths = await uploadAll();
      const result = await registerExecution({
        activityId: activity.id,
        description: editingDescription ? description : "",
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

  const details = [
    {
      label: "Local",
      value: activity.branchName ?? (
        <span className="text-muted-foreground">Canal geral</span>
      ),
    },
    { label: "Canal", value: activity.channelName },
    {
      label: "Prazo",
      value: formatRelativeDue(activity.dueDate),
    },
    {
      label: "Data do registro",
      value: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <header className="flex items-center gap-2 px-4 py-3">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            onClick={onBack}
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </Button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-semibold tracking-tight">
            Concluir atividade
          </h1>
          <p className="text-xs text-muted-foreground">
            Já veio pronta do plano — só anexar a evidência e confirmar.
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
        {/* Dados do plano em modo leitura */}
        <Card className="py-4">
          <CardContent className="flex flex-col gap-3 px-4">
            <div className="space-y-1.5">
              <p className="leading-snug font-semibold">{activity.title}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={activity.status} />
                {activity.category ? (
                  <CategoryBadge category={activity.category} />
                ) : null}
              </div>
            </div>

            {activity.problemTitle ? (
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <span className="text-xs text-muted-foreground">
                  Problema do plano
                </span>
                <p className="leading-snug font-medium">
                  {activity.problemTitle}
                </p>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-sm">
              {details.map((row) => (
                <div key={row.label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="truncate font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Descrição: leitura por padrão, editável com um toque */}
        {editingDescription ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="descricao-ajuste" className="text-sm font-medium">
              O que foi feito de verdade?
            </label>
            <Textarea
              id="descricao-ajuste"
              value={description}
              maxLength={MAX_DESCRIPTION}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ajuste a descrição se a realidade foi diferente do planejado"
              className="min-h-24 text-base"
              autoFocus
            />
            <span className="self-end text-xs text-muted-foreground tabular-nums">
              {description.length}/{MAX_DESCRIPTION}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDescription(true)}
            className="flex min-h-11 w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-xs text-muted-foreground">
                Descrição planejada
              </p>
              <p className="line-clamp-3 text-sm leading-snug">
                {activity.description?.trim() ||
                  "Sem descrição no plano — toque para contar o que foi feito (opcional)."}
              </p>
            </div>
            <Pencil className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          </button>
        )}

        {/* Foto por cima — opcional, com nudge na conclusão */}
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
                <Check className="size-5" />
                Marcar como concluída
              </>
            )}
          </Button>
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
