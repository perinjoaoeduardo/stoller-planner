import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChartColumn, Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getChannelCards } from "@/lib/db/channels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relatórios — Stoller Planner",
};

/**
 * Índice de relatórios: escolha o canal e abra o Relatório de Safra.
 * O recorte de canais respeita o escopo do usuário logado.
 */
export default async function RelatoriosPage() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const channels = await getChannelCards(channelIds);

  const sorted = [...channels].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PageShell
      title="Relatórios"
      description="Fechamento de safra por canal: a história do plano, com evidências."
    >
      {sorted.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ChartColumn />
                </EmptyMedia>
                <EmptyTitle>Nenhum canal no seu escopo</EmptyTitle>
                <EmptyDescription>
                  Quando houver canais vinculados ao seu perfil, os
                  relatórios de safra deles aparecem aqui.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((channel) => (
            <Card
              key={channel.id}
              className="group relative gap-3 transition-colors hover:border-primary/40"
            >
              <CardHeader>
                <CardTitle className="flex items-start gap-2 text-base leading-snug">
                  <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <Link
                    href={`/canais/${channel.id}/relatorio`}
                    className="after:absolute after:inset-0"
                  >
                    {channel.name}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {channel.region}
                  {channel.harvest ? ` · ${channel.harvest}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="tabular-nums">
                    {channel.problemCount}{" "}
                    {channel.problemCount === 1 ? "problema" : "problemas"}
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {channel.activityCount}{" "}
                    {channel.activityCount === 1 ? "atividade" : "atividades"}
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {channel.completedPercent}% concluído
                  </Badge>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
