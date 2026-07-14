import type { Metadata } from "next";
import Link from "next/link";
import { ChartColumn, Store } from "lucide-react";

import {
  CardArrow,
  clickableCardClass,
  NeutralChip,
} from "@/components/shared/clickable-card";
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
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relatórios — Corteva Planner",
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

  // Contexto de safra é global da tela — uma vez no header, não 1x por card.
  const harvest = channels[0]?.harvest ?? null;
  const safraLabel = !harvest
    ? "Safra 2025/26"
    : harvest.startsWith("Safra")
      ? harvest
      : `Safra ${harvest}`;

  return (
    <PageShell
      title="Relatórios"
      description="Fechamento de safra por canal: a história do plano, com evidências."
      actions={
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {safraLabel}
        </Badge>
      }
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
            <Card key={channel.id} className={cn(clickableCardClass, "gap-3")}>
              <CardHeader>
                <CardTitle className="flex items-start gap-2 text-base leading-snug">
                  <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <Link
                    href={`/canais/${channel.id}/relatorio`}
                    className="min-w-0 after:absolute after:inset-0"
                  >
                    {channel.name}
                  </Link>
                  {/* O dado que importa vira badge junto do nome */}
                  <NeutralChip emphasis className="ml-auto shrink-0">
                    {channel.completedPercent}% concluído
                  </NeutralChip>
                </CardTitle>
                <CardDescription>{channel.region}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <NeutralChip>
                    {channel.problemCount}{" "}
                    {channel.problemCount === 1 ? "meta" : "metas"}
                  </NeutralChip>
                  <NeutralChip>
                    {channel.activityCount}{" "}
                    {channel.activityCount === 1 ? "atividade" : "atividades"}
                  </NeutralChip>
                </div>
                <CardArrow />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
