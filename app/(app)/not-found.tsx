import Link from "next/link";
import { Compass } from "lucide-react";

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

/**
 * 404 amigável do app: também é o que outros perfis veem ao tentar
 * abrir rotas exclusivas do CX (requireCx → notFound()).
 */
export default function AppNotFound() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <Card className="flex-1">
        <CardContent className="flex h-full items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Compass />
              </EmptyMedia>
              <EmptyTitle>Página não encontrada</EmptyTitle>
              <EmptyDescription>
                Esta página não existe ou não está disponível para o seu
                perfil. Volte para o início e siga pelo menu lateral.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button nativeButton={false} render={<Link href="/">Ir para o início</Link>} />
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
