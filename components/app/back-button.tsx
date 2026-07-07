"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botão de voltar consistente para telas de detalhe.
 *
 * Usa router.back() quando existe histórico dentro do app; cai no
 * fallbackHref quando o usuário entrou direto pela URL (deep link,
 * refresh) ou o histórico está vazio.
 */
export function BackButton({
  fallbackHref,
  label = "Voltar",
  className,
}: {
  fallbackHref: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={handleClick}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  );
}
