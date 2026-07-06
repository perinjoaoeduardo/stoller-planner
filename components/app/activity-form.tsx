"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DatePicker } from "@/components/app/date-picker";
import { FormShell } from "@/components/app/form-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import {
  ACTIVITY_STATUSES,
  STATUS_LABELS,
  type ActivityStatus,
} from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createActivity, updateActivity } from "@/lib/actions/plan";
import type { ActivityRow } from "@/lib/db/channels";

const activitySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Informe um título com pelo menos 3 caracteres."),
  problemId: z.string().nullable(),
  branchId: z.string().nullable(),
  responsibleId: z.string().nullable(),
  dueDate: z.string().nullable(),
  description: z.string(),
  status: z.enum(
    ["planejada", "em_andamento", "concluida", "atrasada", "nao_feita"],
    "Selecione um status válido."
  ),
});

type ActivityValues = z.infer<typeof activitySchema>;

export type ActivityFormOptions = {
  problems: SelectOption[];
  branches: SelectOption[];
  responsibles: SelectOption[];
};

/**
 * Criar/editar atividade — Sheet no desktop, Drawer no mobile.
 * Problema é opcional, mas a microcopy incentiva o vínculo (conceito
 * Problema → Atividades → Resultado).
 */
export function ActivityForm({
  open,
  onOpenChange,
  planId,
  activity,
  options,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  activity?: ActivityRow | null;
  options: ActivityFormOptions;
}) {
  const isEditing = !!activity;

  const form = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: "",
      problemId: null,
      branchId: null,
      responsibleId: null,
      dueDate: null,
      description: "",
      status: "planejada",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: activity?.title ?? "",
        problemId: activity?.problemId ?? null,
        branchId: activity?.branchId ?? null,
        responsibleId: activity?.responsibleId ?? null,
        dueDate: activity?.dueDate ?? null,
        description: activity?.description ?? "",
        status: activity?.status ?? "planejada",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activity]);

  async function onSubmit(values: ActivityValues) {
    const payload = {
      title: values.title,
      description: values.description || undefined,
      problemId: values.problemId,
      branchId: values.branchId,
      responsibleId: values.responsibleId,
      dueDate: values.dueDate,
      status: values.status as ActivityStatus,
    };

    const result = isEditing
      ? await updateActivity({ ...payload, activityId: activity.id })
      : await createActivity({ ...payload, planId });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      isEditing ? "Atividade atualizada." : "Atividade criada no plano."
    );
    onOpenChange(false);
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar atividade" : "Nova atividade"}
      description={
        isEditing
          ? "Ajuste os dados da atividade do plano."
          : "Adicione uma atividade ao plano da safra."
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup className="gap-5 pt-4">
          <Field data-invalid={!!errors.title || undefined}>
            <FieldLabel htmlFor="activity-title">Título</FieldLabel>
            <Input
              id="activity-title"
              placeholder="Ex.: Treinamento da equipe de balcão"
              aria-invalid={!!errors.title}
              {...form.register("title")}
            />
            <FieldError errors={[errors.title]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="activity-problem">Problema</FieldLabel>
            <Controller
              control={form.control}
              name="problemId"
              render={({ field }) => (
                <SearchableSelect
                  id="activity-problem"
                  options={options.problems}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Sem vínculo por enquanto"
                />
              )}
            />
            <FieldDescription>
              Vincular a um problema fortalece o relatório de safra.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="activity-branch">Filial</FieldLabel>
            <Controller
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <SearchableSelect
                  id="activity-branch"
                  options={options.branches}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Selecione a filial"
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="activity-responsible">Responsável</FieldLabel>
            <Controller
              control={form.control}
              name="responsibleId"
              render={({ field }) => (
                <SearchableSelect
                  id="activity-responsible"
                  options={options.responsibles}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Selecione o responsável"
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="activity-due-date">Prazo</FieldLabel>
            <Controller
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <DatePicker
                  id="activity-due-date"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selecione o prazo"
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="activity-description">
              Descrição{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </FieldLabel>
            <Textarea
              id="activity-description"
              rows={3}
              placeholder="Detalhe o que precisa ser feito e o resultado esperado."
              {...form.register("description")}
            />
          </Field>

          <Field data-invalid={!!errors.status || undefined}>
            <FieldLabel htmlFor="activity-status">Status</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger id="activity-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.status]} />
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
                "Criar atividade"
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
