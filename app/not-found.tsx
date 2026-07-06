import Link from "next/link";
import { Compass } from "lucide-react";

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

/** 404 global (fora do shell do app): URLs que não existem no produto. */
export default function GlobalNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-4">
      <BrandLogo />
      <Card className="w-full max-w-md">
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Compass />
              </EmptyMedia>
              <EmptyTitle>Página não encontrada</EmptyTitle>
              <EmptyDescription>
                O endereço que você tentou abrir não existe no Stoller
                Planner. Confira o link ou volte para o início.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button nativeButton={false} render={<Link href="/" />}>
                Ir para o início
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
