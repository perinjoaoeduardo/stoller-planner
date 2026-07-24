"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ACTIVITY_STATUSES,
  STATUS_LABELS,
  StatusBadge,
  type ActivityStatus,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { changeActivityStatus } from "@/lib/actions/plan";
import { cn } from "@/lib/utils";

/**
 * Card "Status" do detalhe, enxuto: badge grande + contexto ("Em
 * andamento desde 06 jul"), Select e confirmação. Concluir seta
 * completed_at no servidor; reabrir limpa — regras existentes.
 *
 * `title` e `extra` existem pro painel flutuante, que reaproveita este
 * card como bloco "Situação" (título trocado, prazo injetado acima do
 * seletor) sem duplicar a lógica de mudança de status.
 */
export function StatusCard({
  activityId,
  status,
  contextLabel,
  canChange,
  onChanged,
  title = "Status",
  extra,
}: {
  activityId: string;
  status: ActivityStatus;
  /** "Em andamento desde 06 jul" / "Concluída em 15 mar". */
  contextLabel: string | null;
  canChange: boolean;
  /** Chamado após mudança bem-sucedida (ex.: refresh do painel flutuante). */
  onChanged?: () => void;
  title?: string;
  /** Conteúdo extra entre o contexto e o seletor (ex.: prazo em destaque). */
  extra?: React.ReactNode;
}) {
  const [selected, setSelected] = React.useState<ActivityStatus>(status);
  const [pending, startTransition] = React.useTransition();

  // Mantém o Select em sincronia se o status mudar por fora (refresh do
  // painel após outra edição inline) — ajuste durante o render, sem
  // efeito, pra não disparar uma renderização em cascata.
  const [trackedStatus, setTrackedStatus] = React.useState(status);
  if (status !== trackedStatus) {
    setTrackedStatus(status);
    setSelected(status);
  }

  function handleConfirm() {
    const next = selected;
    startTransition(async () => {
      const result = await changeActivityStatus({
        activityId,
        status: next,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChanged?.();
      if (next === "concluida") {
        toast.success("Atividade concluída. Bom trabalho!");
      } else if (status === "concluida") {
        toast.success("Atividade reaberta — de volta ao andamento.");
      } else {
        toast.success(`Status alterado para "${STATUS_LABELS[next]}".`);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <StatusBadge status={status} className="w-fit px-3 py-1 text-sm" />
          {contextLabel ? (
            <p
              className={cn(
                "text-sm",
                status === "atrasada"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {contextLabel}
            </p>
          ) : null}
        </div>
        {extra}
        {canChange ? (
          <div className="flex flex-col gap-2">
            <Select
              value={selected}
              onValueChange={(value) => setSelected(value as ActivityStatus)}
              items={ACTIVITY_STATUSES.map((item) => ({
                value: item,
                label: STATUS_LABELS[item],
              }))}
            >
              <SelectTrigger className="h-11 w-full sm:h-9" aria-label="Novo status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {STATUS_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="h-11 sm:h-9"
              onClick={handleConfirm}
              disabled={pending || selected === status}
            >
              {pending ? (
                <>
                  <Spinner />
                  Salvando...
                </>
              ) : (
                "Confirmar mudança"
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
