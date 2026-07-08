"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ProblemForm } from "@/components/app/problem-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { deleteProblem, moveProblem } from "@/lib/actions/plan";
import type { ActivityRow, ProblemRow } from "@/lib/db/channels";

/**
 * Tab "Problemas" da página do canal: lista ordenável de problemas com
 * progresso das atividades vinculadas e CRUD completo (DSM do canal/CX).
 */
export function ProblemsTab({
  planId,
  problems,
  activities,
  canEdit,
}: {
  planId: string;
  problems: ProblemRow[];
  activities: ActivityRow[];
  canEdit: boolean;
}) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProblemRow | null>(null);
  const [deleting, setDeleting] = React.useState<ProblemRow | null>(null);
  const [pending, startTransition] = React.useTransition();

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(problem: ProblemRow) {
    setEditing(problem);
    setFormOpen(true);
  }

  function handleMove(problemId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveProblem({ problemId, direction });
      if (!result.ok) toast.error(result.error);
    });
  }

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteProblem({ problemId: deleting.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Meta excluída. As atividades foram mantidas.");
    setDeleting(null);
  }

  const deletingCount = deleting
    ? activities.filter((activity) => activity.problemId === deleting.id).length
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus />
            Nova meta
          </Button>
        </div>
      ) : null}

      {problems.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListTodo />
                </EmptyMedia>
                <EmptyTitle>Nenhuma meta definida</EmptyTitle>
                <EmptyDescription>
                  Todo bom plano começa nomeando as metas do canal. As
                  atividades da safra nascem delas.
                </EmptyDescription>
              </EmptyHeader>
              {canEdit ? (
                <EmptyContent>
                  <Button onClick={openCreate}>
                    <Plus />
                    Mapear primeira meta
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {problems.map((problem, index) => {
            const linked = activities.filter(
              (activity) => activity.problemId === problem.id
            );
            const completed = linked.filter(
              (activity) => activity.status === "concluida"
            ).length;
            const percent =
              linked.length > 0
                ? Math.round((completed / linked.length) * 100)
                : 0;

            return (
              <Card key={problem.id} className="gap-3 py-4">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium leading-snug">
                        {problem.title}
                      </p>
                      {problem.description ? (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {problem.description}
                        </p>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending || index === 0}
                          onClick={() => handleMove(problem.id, "up")}
                        >
                          <ArrowUp />
                          <span className="sr-only">Subir meta</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending || index === problems.length - 1}
                          onClick={() => handleMove(problem.id, "down")}
                        >
                          <ArrowDown />
                          <span className="sr-only">Descer meta</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal />
                                <span className="sr-only">
                                  Ações da meta
                                </span>
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(problem)}>
                              <Pencil />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleting(problem)}
                            >
                              <Trash2 />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="tabular-nums">
                      {linked.length}{" "}
                      {linked.length === 1 ? "atividade" : "atividades"}
                    </Badge>
                    <Progress
                      value={percent}
                      className="flex-1 [&_[data-slot=progress-track]]:h-1.5"
                      aria-label={`${percent}% das atividades concluídas`}
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {percent}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProblemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        planId={planId}
        problem={editing}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCount > 0
                ? `${deletingCount} ${
                    deletingCount === 1
                      ? "atividade ficará sem meta vinculada"
                      : "atividades ficarão sem meta vinculada"
                  } — elas não serão excluídas. Essa ação não pode ser desfeita.`
                : "Esta meta não tem atividades vinculadas. Essa ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Excluir meta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
