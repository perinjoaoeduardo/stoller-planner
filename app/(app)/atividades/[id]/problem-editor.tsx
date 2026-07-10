"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Link2, Pencil, TriangleAlert, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { updateActivityProblem } from "@/lib/actions/plan";
import type { ProblemOption } from "@/lib/db/channels";
import { cn } from "@/lib/utils";

/**
 * Vínculo com problema no card "Sobre" do detalhe: com vínculo, o
 * título vira link para a página do canal; sem vínculo (e com problemas
 * no plano), badge tracejada + micro botão "Vincular" que abre um
 * Popover com a lista — um toque resolve.
 */
export function ProblemEditor({
  activityId,
  problemId,
  problemTitle,
  problems,
  canEdit,
  showPendency,
  channelHref,
  onChanged,
}: {
  activityId: string;
  problemId: string | null;
  problemTitle: string | null;
  problems: ProblemOption[];
  canEdit: boolean;
  showPendency: boolean;
  channelHref: string;
  /** Chamado após vincular/desvincular (ex.: refresh do painel flutuante). */
  onChanged?: () => void;
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
    onChanged?.();
    toast.success(
      nextProblemId
        ? "Meta vinculada à atividade."
        : "Vínculo com meta removido."
    );
    setOpen(false);
  }

  const canPick = canEdit && problems.length > 0;

  const picker = canPick ? (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-muted-foreground"
          >
            {problemTitle ? (
              <>
                <Pencil className="size-3.5" />
                <span className="sr-only">Alterar meta vinculada</span>
              </>
            ) : (
              <>
                <Link2 className="size-3.5" />
                Vincular
              </>
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Vincular a uma meta</PopoverTitle>
          <PopoverDescription>
            Escolha a meta do plano que esta ação apoia.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {problems.map((problem) => {
            const active = problem.id === problemId;
            return (
              <button
                key={problem.id}
                type="button"
                disabled={saving !== null}
                onClick={() => void save(problem.id)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm font-medium transition-colors",
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
        {problemId ? (
          <Button
            variant="outline"
            size="sm"
            className="h-10 text-muted-foreground"
            disabled={saving !== null}
            onClick={() => void save(null)}
          >
            <Unlink className="size-4" />
            Remover vínculo
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  ) : null;

  if (problemTitle) {
    return (
      <span className="flex min-w-0 max-w-full items-center gap-1">
        <Link
          href={channelHref}
          className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
        >
          {problemTitle}
        </Link>
        {picker}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      {showPendency ? (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        >
          <TriangleAlert aria-hidden="true" />
          Vincular meta
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-dashed text-muted-foreground"
        >
          Sem vínculo
        </Badge>
      )}
      {picker}
    </span>
  );
}
