"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { BrandLogo } from "@/components/app/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** Página de erro global: mensagem clara + tentar novamente. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-4">
      <BrandLogo />
      <Card className="w-full max-w-md">
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlert />
              </EmptyMedia>
              <EmptyTitle>Algo deu errado</EmptyTitle>
              <EmptyDescription>
                Encontramos um erro inesperado ao carregar esta página. Tente
                novamente — se persistir, fale com o time de excelência
                comercial (CX).
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex items-center gap-2">
                <Button onClick={reset}>
                  <RotateCcw />
                  Tentar novamente
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/" />}
                >
                  Ir para o início
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
