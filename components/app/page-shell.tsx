"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Padroniza o cabeçalho e o container de conteúdo de todas as páginas.
 *
 * Hierarquia visual gravada aqui — as páginas passam só o conteúdo:
 *   [Voltar]
 *      ↓ mt-4
 *   [Breadcrumb]
 *      ↓ mt-3
 *   [Título   ↔ Ações]
 *      ↓ mt-2
 *   [Descrição]
 *      ↓ gap-8
 *   [Conteúdo]
 *
 * Voltar aparece só quando `backHref` OU `onBack` é passado. Rotas de
 * topo (Início, Meus Canais lista, etc.) não devem passar nem um nem
 * outro.
 */
export function PageShell({
  title,
  description,
  descriptionClassName,
  breadcrumb,
  actions,
  backHref,
  onBack,
  className,
  children,
}: {
  /** Texto na maioria das telas; aceita nó para casos como o perfil,
   *  onde o avatar precisa ficar ao lado do nome (dentro do h1). */
  title: React.ReactNode;
  description?: React.ReactNode;
  descriptionClassName?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  /** URL de fallback do Voltar (usa router.back() se histórico existir). */
  backHref?: string;
  /** Callback para fluxos internos (wizard do Registrar). */
  onBack?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const hasBack = !!backHref || !!onBack;

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else if (backHref) {
      router.push(backHref);
    }
  }

  const backButton = hasBack ? (
    onBack || !backHref ? (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={handleBack}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={handleBack}
        nativeButton={false}
        render={<Link href={backHref} />}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Button>
    )
  ) : null;

  return (
    <div className={cn("flex flex-1 flex-col gap-8 p-5 md:p-8", className)}>
      <header>
        {backButton}
        {breadcrumb ? (
          <div className={hasBack ? "mt-4" : undefined}>{breadcrumb}</div>
        ) : null}
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-4",
            breadcrumb ? "mt-3" : hasBack ? "mt-4" : undefined
          )}
        >
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p
                className={
                  descriptionClassName ?? "mt-2 text-sm text-muted-foreground"
                }
              >
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}
