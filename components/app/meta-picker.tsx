"use client";

import * as React from "react";
import { Check, ChevronDown, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MetaOption = { id: string; title: string };

/**
 * Escolher a meta do plano — um controle que ABRE e escolhe.
 *
 * Nem lista aberta nem combobox. A lista aberta enchia meia tela com
 * frases inteiras que só se lê uma vez, e o combobox pendurava um
 * popover de busca para trocar entre três ou quatro opções — busca é
 * para quando não se consegue varrer com o olho, e aqui se consegue.
 *
 * O gatilho mostra a escolha atual; o popover mostra as opções. Mesmo
 * padrão do "Vincular a uma meta" do painel da atividade, para a
 * pergunta ser feita de um jeito só no app inteiro.
 *
 * "Vincular depois" é opção explícita, não ausência de escolha: a
 * atividade nasce como pendência de vínculo, e isso é uma decisão.
 */
export function MetaPicker({
  metas,
  value,
  onChange,
  className,
}: {
  metas: MetaOption[];
  /** `null` = vincular depois. */
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const escolhida = metas.find((meta) => meta.id === value) ?? null;

  function escolher(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-auto min-h-10 w-full justify-start gap-2 border-input bg-card px-3 py-2 text-left font-normal",
              className
            )}
          />
        }
      >
        <Target className="size-4 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "min-w-0 flex-1 whitespace-normal leading-snug",
            escolhida ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {escolhida?.title ?? "Vincular depois"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-(--anchor-width) min-w-72">
        <PopoverHeader>
          <PopoverTitle>Meta do plano</PopoverTitle>
          <PopoverDescription>
            Escolha a meta que esta atividade apoia.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {metas.map((meta) => (
            <Opcao
              key={meta.id}
              ativa={meta.id === value}
              onClick={() => escolher(meta.id)}
            >
              {meta.title}
            </Opcao>
          ))}
          <Opcao ativa={value === null} onClick={() => escolher(null)}>
            <span className="flex flex-col">
              Vincular depois
              <span className="text-xs font-normal italic text-muted-foreground">
                Fica como pendência.
              </span>
            </span>
          </Opcao>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Opcao({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm font-medium transition-colors",
        ativa
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          ativa
            ? "border-primary bg-primary text-primary-foreground"
            : "text-transparent"
        )}
      >
        <Check className="size-3.5" />
      </span>
      <span className="min-w-0 leading-snug">{children}</span>
    </button>
  );
}
