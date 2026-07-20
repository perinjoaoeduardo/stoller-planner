"use client";

import Link from "next/link";
import { Copy, MoreHorizontal, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Menu "..." das linhas de acompanhamento: abre o perfil da pessoa
 * (quando `profileHref` é passado) e copia o resumo de cobrança pronto
 * para colar no WhatsApp/Teams. O texto vem pronto do servidor.
 */
export function CopySummaryMenu({
  summaryText,
  profileHref,
}: {
  summaryText: string;
  profileHref?: string;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success("Resumo copiado", {
        description: "Cole no WhatsApp ou Teams para dar o toque.",
      });
    } catch {
      toast.error("Não foi possível copiar", {
        description: "Copie manualmente ou tente de novo.",
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Ações</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {profileHref ? (
          <DropdownMenuItem
            render={
              <Link href={profileHref}>
                <User />
                Ver perfil
              </Link>
            }
          />
        ) : null}
        <DropdownMenuItem onClick={handleCopy}>
          <Copy />
          Copiar resumo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
