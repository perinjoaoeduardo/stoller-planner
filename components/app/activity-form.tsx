"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
import {
  buildActivitySchema,
  isProblemRequired,
  type ActivityFormValues,
} from "@/lib/activities/rules";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/config";
import type { ActivityRow } from "@/lib/db/channels";

type ActivityValues = ActivityFormValues;

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

  // Regras centrais: problema é obrigatório se o plano tem problemas;
  // sem problemas cadastrados, o campo some do formulário.
  const problemRequired = isProblemRequired({
    problemCount: options.problems.length,
  });
  const activitySchema = React.useMemo(
    () => buildActivitySchema({ problemCount: options.problems.length }),
    [options.problems.length]
  );

  const form = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: "",
      category: undefined as unknown as ActivityCategory,
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
        category: (activity?.category ?? undefined) as ActivityCategory,
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
      category: values.category,
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

          <Field data-invalid={!!errors.category || undefined}>
            <FieldLabel htmlFor="activity-category">Categoria</FieldLabel>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value ?? null}
                  onValueChange={(value) => field.onChange(value)}
                  items={ACTIVITY_CATEGORIES.map((category) => ({
                    value: category,
                    label: CATEGORY_LABELS[category],
                  }))}
                >
                  <SelectTrigger id="activity-category" className="w-full">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.category]} />
          </Field>

          {options.problems.length > 0 ? (
            <Field data-invalid={!!errors.problemId || undefined}>
              <FieldLabel htmlFor="activity-problem">Meta</FieldLabel>
              <Controller
                control={form.control}
                name="problemId"
                render={({ field }) => (
                  <SearchableSelect
                    id="activity-problem"
                    options={options.problems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={
                      problemRequired
                        ? "Selecione a meta do plano"
                        : "Sem vínculo por enquanto"
                    }
                  />
                )}
              />
              {problemRequired ? (
                <FieldDescription>
                  Toda atividade apoia uma meta do plano.
                </FieldDescription>
              ) : (
                <FieldDescription>
                  Vincular a uma meta fortalece o relatório de safra.
                </FieldDescription>
              )}
              <FieldError errors={[errors.problemId]} />
            </Field>
          ) : null}

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
                  items={ACTIVITY_STATUSES.map((status) => ({
                    value: status,
                    label: STATUS_LABELS[status],
                  }))}
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
