import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
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
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getSeasonReport } from "@/lib/db/report";

import { ReportView } from "./report-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relatório de safra — Corteva Planner",
};

function ReportNotFound() {
  return (
    <PageShell
      title="Relatório de safra"
      description="Fechamento narrativo do plano do canal."
    >
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>Canal não encontrado ou sem acesso</EmptyTitle>
              <EmptyDescription>
                Este canal não existe ou não faz parte da sua carteira. Se
                acha que deveria ter acesso, fale com o time de excelência
                comercial (CX).
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/relatorios" />}
              >
                Voltar para relatórios
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}

/**
 * Relatório de Safra do canal. Permissão: DSM do canal e CX; RTV/RDC
 * visualizam os canais do próprio escopo — exatamente o recorte de
 * getScopedChannelIds.
 */
export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);

  if (!channelIds.includes(id)) return <ReportNotFound />;

  const report = await getSeasonReport(id);
  if (!report) return <ReportNotFound />;

  return <ReportView report={report} />;
}
