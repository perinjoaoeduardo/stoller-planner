import { ClipboardList } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function AtividadesPage() {
  return (
    <PageShell
      title="Atividades"
      description="Planejamento e execução das atividades da safra."
    >
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>Atividades em construção</EmptyTitle>
              <EmptyDescription>
                A lista completa de atividades com filtros chega no próximo
                bloco do projeto.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}
