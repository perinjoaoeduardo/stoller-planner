import { Map } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function RegioesPage() {
  return (
    <PageShell
      title="Regiões"
      description="Visão consolidada da execução por região comercial."
    >
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Map />
              </EmptyMedia>
              <EmptyTitle>Regiões em construção</EmptyTitle>
              <EmptyDescription>
                A visão consolidada por região chega em um próximo bloco do
                projeto.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}
