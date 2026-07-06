import { ChartColumn } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function RelatoriosPage() {
  return (
    <PageShell
      title="Relatórios"
      description="Fechamento de safra e acompanhamento por canal."
    >
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartColumn />
              </EmptyMedia>
              <EmptyTitle>Relatórios em construção</EmptyTitle>
              <EmptyDescription>
                O relatório de fechamento de safra chega em um bloco futuro
                do projeto.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}
