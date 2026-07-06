import { Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function CanaisPage() {
  return (
    <PageShell
      title="Canais"
      description="Distribuidores e filiais vinculados à sua carteira."
    >
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Store />
              </EmptyMedia>
              <EmptyTitle>Canais em construção</EmptyTitle>
              <EmptyDescription>
                A gestão de canais e filiais chega no próximo bloco do
                projeto.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}
