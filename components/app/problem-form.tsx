"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormShell } from "@/components/app/form-shell";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createProblem, updateProblem } from "@/lib/actions/plan";
import type { ProblemRow } from "@/lib/db/channels";

const problemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "O título precisa de pelo menos 5 caracteres."),
  description: z.string(),
});

type ProblemValues = z.infer<typeof problemSchema>;

/** Criar/editar problema — Sheet no desktop, Drawer no mobile. */
export function ProblemForm({
  open,
  onOpenChange,
  planId,
  problem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  problem?: ProblemRow | null;
}) {
  const isEditing = !!problem;

  const form = useForm<ProblemValues>({
    resolver: zodResolver(problemSchema),
    defaultValues: { title: "", description: "" },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: problem?.title ?? "",
        description: problem?.description ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, problem]);

  async function onSubmit(values: ProblemValues) {
    const result = isEditing
      ? await updateProblem({
          problemId: problem.id,
          title: values.title,
          description: values.description || undefined,
        })
      : await createProblem({
          planId,
          title: values.title,
          description: values.description || undefined,
        });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      isEditing ? "Meta atualizada." : "Meta adicionada ao plano."
    );
    onOpenChange(false);
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar meta" : "Nova meta"}
      description="A meta é o ponto de partida da corrente Meta → Atividades → Resultado."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup className="gap-5 pt-4">
          <Field data-invalid={!!errors.title || undefined}>
            <FieldLabel htmlFor="problem-title">Título</FieldLabel>
            <Input
              id="problem-title"
              placeholder="Ex.: Queda de participação em fungicidas"
              aria-invalid={!!errors.title}
              {...form.register("title")}
            />
            <FieldError errors={[errors.title]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="problem-description">
              Descrição{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </FieldLabel>
            <Textarea
              id="problem-description"
              rows={4}
              placeholder="Contexto da meta: números, causas e impacto no canal."
              {...form.register("description")}
            />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Spinner />
                  Salvando...
                </>
              ) : isEditing ? (
                "Salvar alterações"
              ) : (
                "Criar meta"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </FieldGroup>
      </form>
    </FormShell>
  );
}
