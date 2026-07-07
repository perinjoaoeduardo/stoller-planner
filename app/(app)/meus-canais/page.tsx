import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getChannelCards, type ChannelCard } from "@/lib/db/channels";
import { HEALTH_CONFIG } from "@/lib/plan-utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus Canais — Corteva Planner",
};

/** "Safra 2025/26" mesmo quando o banco já traz o prefixo "Safra". */
function harvestLabel(harvest: string | null): string {
  if (!harvest) return "Safra 2025/26";
  return harvest.startsWith("Safra") ? harvest : `Safra ${harvest}`;
}

/** Linha de metadados do canal: filiais · feitas · pendentes · atrasadas. */
function ChannelMeta({ channel }: { channel: ChannelCard }) {
  return (
    <p className="text-sm text-muted-foreground tabular-nums">
      {channel.branchCount} {channel.branchCount === 1 ? "filial" : "filiais"}
      {" · "}
      {channel.completedCount} de {channel.activityCount} feitas
      {" · "}
      {channel.pendingCount}{" "}
      {channel.pendingCount === 1 ? "pendente" : "pendentes"}
      {channel.lateCount > 0 ? (
        <span className="font-medium text-amber-600 dark:text-amber-400">
          {" · "}
          {channel.lateCount}{" "}
          {channel.lateCount === 1 ? "atrasada" : "atrasadas"}
        </span>
      ) : null}
    </p>
  );
}

/**
 * "Meus Canais" do campo: um item rico por canal, com saúde, progresso
 * e o que falta fazer — o suficiente para decidir onde tocar primeiro.
 */
export default async function MeusCanaisPage() {
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  const channels = await getChannelCards(channelIds);

  // Canais com atrasadas primeiro; empate por nome.
  const sorted = [...channels].sort(
    (a, b) =>
      Number(b.lateCount > 0) - Number(a.lateCount > 0) ||
      a.name.localeCompare(b.name)
  );

  return (
    <PageShell
      title="Meus Canais"
      description="Distribuidores em que você atua nesta safra."
    >
      {sorted.length === 0 ? (
        <Empty className="flex-1 rounded-3xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle>Nenhum canal vinculado</EmptyTitle>
            <EmptyDescription>
              Você ainda não está vinculado a nenhum canal. Fale com o time de
              CX.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((channel) => (
            <Card
              key={channel.id}
              className="p-0 transition-colors hover:bg-muted/40"
            >
              <Link
                href={`/meus-canais/${channel.id}`}
                className="flex gap-3 p-5"
              >
                <span
                  aria-label={HEALTH_CONFIG[channel.health].label}
                  title={HEALTH_CONFIG[channel.health].label}
                  className={`size-2.5 shrink-0 self-start translate-y-2 rounded-full ${HEALTH_CONFIG[channel.health].dotClass}`}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div>
                    <p className="truncate text-base font-medium">
                      {channel.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {harvestLabel(channel.harvest)}
                    </p>
                  </div>
                  <ChannelMeta channel={channel} />
                  <Progress
                    value={channel.completedPercent}
                    className="mt-0.5 h-1"
                  />
                </div>
                <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
