import type { Metadata } from "next";
import { Users } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "Equipe — Corteva Planner",
};

/**
 * Placeholder da tela Equipe (detalhamento por RTV). O card "RTVs na
 * equipe" da home do DSM aponta pra cá. A tela completa — desempenho e
 * carga por RTV — entra num bloco futuro.
 */
export default function EquipePage() {
  return (
    <PageShell
      title="Equipe"
      description="Desempenho e carga por RTV dos seus canais."
    >
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>Em breve</EmptyTitle>
              <EmptyDescription>
                O detalhamento por RTV — atividades, atrasos e ritmo de
                registro de cada responsável — vai viver aqui.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}
