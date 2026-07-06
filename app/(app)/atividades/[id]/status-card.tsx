"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ACTIVITY_STATUSES,
  STATUS_LABELS,
  StatusBadge,
  type ActivityStatus,
} from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { changeActivityStatus } from "@/lib/actions/plan";

/**
 * Card "Status" do detalhe: seleciona o novo status e confirma.
 * Mudou para "Concluída" → o servidor seta completed_at e registra o
 * evento na linha do tempo.
 */
export function StatusCard({
  activityId,
  status,
  canChange,
}: {
  activityId: string;
  status: ActivityStatus;
  canChange: boolean;
}) {
  const [selected, setSelected] = React.useState<ActivityStatus>(status);
  const [pending, startTransition] = React.useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await changeActivityStatus({
        activityId,
        status: selected,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        selected === "concluida"
          ? "Atividade concluída. Bom trabalho!"
          : `Status alterado para "${STATUS_LABELS[selected]}".`
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
        <CardDescription>Situação atual da atividade.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <StatusBadge status={status} className="w-fit px-3 py-1 text-sm" />
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
              <SelectTrigger className="w-full" aria-label="Novo status">
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
