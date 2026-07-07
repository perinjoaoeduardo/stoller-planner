import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getChannelDetail, getPlanBoard } from "@/lib/db/channels";
import { isLateActivity } from "@/lib/db/status";
import { cn } from "@/lib/utils";

import { ChannelActivities } from "./channel-activities";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Canal — Corteva Planner",
};

/** "Safra 2025/26" mesmo quando o banco já traz o prefixo "Safra". */
function harvestLabel(harvest: string | null | undefined): string {
  if (!harvest) return "Safra 2025/26";
  return harvest.startsWith("Safra") ? harvest : `Safra ${harvest}`;
}

/** 404 amigável: canal inexistente ou fora do escopo do usuário. */
function ChannelNotFound() {
  return (
    <PageShell title="Canal" className="mx-auto w-full max-w-2xl">
      <Empty className="flex-1 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store />
          </EmptyMedia>
          <EmptyTitle>Canal não encontrado ou sem acesso</EmptyTitle>
          <EmptyDescription>
            Este canal não existe ou não faz parte dos seus vínculos nesta
            safra.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            nativeButton={false}
            render={<Link href="/meus-canais">Voltar para Meus Canais</Link>}
          />
        </EmptyContent>
      </Empty>
    </PageShell>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "alert" | "ok";
}) {
  return (
    <Card className="gap-1 rounded-2xl px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tracking-tight tabular-nums",
          tone === "alert" && "text-amber-600 dark:text-amber-400",
          tone === "ok" && "text-[#4A7A10] dark:text-[#B5DC73]"
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>
      ) : null}
    </Card>
  );
}

/**
 * Visão do canal para o campo: resumo enxuto, filtros mínimos e cards
 * de atividade com ação sempre à mão. Blocos e controles somem quando
 * não têm o que dizer.
 */
export default async function MeuCanalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(id)) return <ChannelNotFound />;

  const channel = await getChannelDetail(id);
  if (!channel) return <ChannelNotFound />;

  const board = channel.plan
    ? await getPlanBoard(channel.plan.id, { id: channel.id, name: channel.name })
    : { problems: [], activities: [] };
  const activities = board.activities;

  // Bloco B — métricas do resumo.
  const total = activities.length;
  const completed = activities.filter(
    (activity) => activity.status === "concluida"
  ).length;
  const late = activities.filter(isLateActivity).length;
  const pending = activities.filter(
    (activity) =>
      activity.status === "planejada" || activity.status === "em_andamento"
  ).length;
  const completedPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <PageShell
      title={channel.name}
      description={`${harvestLabel(channel.plan?.harvest)} · ${channel.region}`}
      className="mx-auto w-full max-w-2xl"
      breadcrumb={
        <Breadcrumb className="mb-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/meus-canais" />}>
                Meus Canais
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{channel.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      {/* Bloco B — resumo em 4 métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total" value={total} />
        <MetricCard
          label="Feitas"
          value={completed}
          hint={`${completedPercent}%`}
        />
        <MetricCard label="Pendentes" value={pending} />
        <MetricCard
          label="Atrasadas"
          value={late}
          tone={late > 0 ? "alert" : "ok"}
        />
      </div>

      {/* Blocos C + D — filtros e lista de atividades */}
      <ChannelActivities
        activities={activities}
        branches={channel.branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
        }))}
        profileId={profile.id}
      />
    </PageShell>
  );
}
