"use client";

import * as React from "react";
import { Check, Target } from "lucide-react";
import { toast } from "sonner";

import { IconBox } from "@/components/shared/icon-box";
import { WizardHeader } from "@/components/shared/wizard-shell";
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
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createProblem } from "@/lib/actions/plan";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

const MIN_TITLE = 5;

/**
 * Wizard de nova meta — mesma linguagem do ActionWizard (drawer lateral
 * no desktop, bottom no mobile, pergunta guia, rodapé fixo e tela de
 * sucesso com "Criar outra"). Só criação; edição segue no ProblemForm.
 */
export function MetaWizard({
  open,
  onOpenChange,
  planId,
  channelName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  channelName?: string | null;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [view, setView] = React.useState<"form" | "success">("form");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [createdTitle, setCreatedTitle] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const canSubmit = title.trim().length >= MIN_TITLE;
  const hasDirtyData =
    view === "form" && (title.trim().length > 0 || description.trim().length > 0);

  function reset() {
    setView("form");
    setTitle("");
    setDescription("");
    setCreatedTitle(null);
    setSubmitting(false);
  }

  function handleClose() {
    onOpenChange(false);
  }

  function tryClose() {
    if (hasDirtyData) {
      setShowConfirm(true);
    } else {
      handleClose();
    }
  }

  React.useEffect(() => {
    if (!open) {
      const timer = setTimeout(reset, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const result = await createProblem({
      planId,
      title: title.trim(),
      description: description.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCreatedTitle(title.trim());
    setView("success");
  }

  function startAnother() {
    reset();
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) tryClose();
        }}
        modal
        swipeDirection={isDesktop ? "right" : "down"}
      >
        <DrawerContent
          className={cn(
            isDesktop && "data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]"
          )}
        >
          <DrawerTitle className="sr-only">Nova meta</DrawerTitle>
          <DrawerDescription className="sr-only">
            Wizard para criar uma meta do plano do canal
          </DrawerDescription>

          {view === "form" ? (
            <>
              <WizardHeader
                title="Nova meta"
                subtitle={channelName}
                onClose={tryClose}
              />

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Qual resultado você quer alcançar neste canal?
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    A meta é o ponto de partida da corrente Meta → Atividades →
                    Resultado.
                  </p>
                </div>

                <fieldset className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="meta-title">
                    Título <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="meta-title"
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Queda de participação em fungicidas"
                    className="border-input bg-card text-base"
                    maxLength={200}
                  />
                </fieldset>

                <fieldset className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-medium"
                    htmlFor="meta-description"
                  >
                    Descrição{" "}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </label>
                  <Textarea
                    id="meta-description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contexto da meta: números, causas e impacto no canal."
                    className="border-input bg-card"
                  />
                </fieldset>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
                {!canSubmit && (
                  <p className="text-xs text-muted-foreground">
                    Dê um título de pelo menos {MIN_TITLE} caracteres
                  </p>
                )}
                <Button
                  variant="brand"
                  disabled={!canSubmit || submitting}
                  onClick={() => void submit()}
                >
                  {submitting ? (
                    <>
                      <Spinner className="size-4" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Target className="size-4" />
                      Criar meta
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
              <div className="flex w-full max-w-sm flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-success-bg duration-300 animate-in zoom-in-50">
                  <Check className="size-7 text-success" strokeWidth={2.5} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Meta criada</h3>
                {channelName ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adicionada ao plano de {channelName}.
                  </p>
                ) : null}
                {createdTitle ? (
                  <div className="mt-5 flex w-full items-center gap-3 rounded-xl border border-border p-3.5 text-left">
                    <IconBox icon={Target} size="lg" iconClassName="size-4" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {createdTitle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Agende atividades para colocá-la em movimento.
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-5 grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={startAnother}
                  >
                    Criar outra
                  </Button>
                  <Button className="h-10" onClick={handleClose}>
                    Concluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem dados preenchidos que serão perdidos ao fechar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setShowConfirm(false);
                handleClose();
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
