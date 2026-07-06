import { ClipboardCheck } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function RegistrarExecucaoPage() {
  return (
    <PageShell
      title="Registrar execução"
      description="Atualize o status das suas atividades com foto e descrição."
    >
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardCheck />
              </EmptyMedia>
              <EmptyTitle>Registro em construção</EmptyTitle>
              <EmptyDescription>
                O registro rápido de execução com foto chega em um próximo
                bloco do projeto.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}
