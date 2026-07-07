"use client";

import * as React from "react";
import { Check, Pencil, TriangleAlert, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { updateActivityProblem } from "@/lib/actions/plan";
import type { ProblemOption } from "@/lib/db/channels";
import { cn } from "@/lib/utils";

/**
 * Editor trivial do vínculo com problema no detalhe da atividade:
 * um toque abre a lista de problemas do plano (Drawer, funciona em
 * mobile e desktop). Destaca a pendência do "vincular depois".
 */
export function ProblemEditor({
  activityId,
  problemId,
  problemTitle,
  problems,
  canEdit,
  showPendency,
}: {
  activityId: string;
  problemId: string | null;
  problemTitle: string | null;
  problems: ProblemOption[];
  canEdit: boolean;
  showPendency: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState<string | "none" | null>(null);

  async function save(nextProblemId: string | null) {
    setSaving(nextProblemId ?? "none");
    const result = await updateActivityProblem({
      activityId,
      problemId: nextProblemId,
    });
    setSaving(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      nextProblemId
        ? "Problema vinculado à atividade."
        : "Vínculo com problema removido."
    );
    setOpen(false);
  }

  const badge = problemTitle ? (
    <Badge variant="outline" className="max-w-full">
      <span className="truncate">{problemTitle}</span>
    </Badge>
  ) : showPendency ? (
    <Badge
      variant="outline"
      className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
    >
      <TriangleAlert aria-hidden="true" />
      Vincular problema
    </Badge>
  ) : (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      Sem vínculo
    </Badge>
  );

  if (!canEdit || problems.length === 0) return badge;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md text-left"
        aria-label="Editar problema vinculado"
      >
        {badge}
        <Pencil className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </button>

      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Vincular a um problema</DrawerTitle>
            <DrawerDescription>
              Toda atividade responde a um problema do plano — escolha o que
              esta ação ataca.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto p-4">
            {problems.map((problem) => {
              const active = problem.id === problemId;
              return (
                <button
                  key={problem.id}
                  type="button"
                  disabled={saving !== null}
                  onClick={() => void save(problem.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-card hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-transparent"
                    )}
                  >
                    {saving === problem.id ? (
                      <Spinner className="size-3.5 text-muted-foreground" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                  </span>
                  <span className="leading-snug">{problem.title}</span>
                </button>
              );
            })}
          </div>
          <DrawerFooter>
            {problemId ? (
              <Button
                variant="outline"
                className="h-11 text-muted-foreground"
                disabled={saving !== null}
                onClick={() => void save(null)}
              >
                <Unlink className="size-4" />
                Remover vínculo
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
