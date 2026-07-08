import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Store } from "lucide-react";

import { BackButton } from "@/components/app/back-button";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
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

import { MeuCanalView } from "./meu-canal-view";
import { ProblemsSheetButton } from "./problems-sheet-button";

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
    <PageShell title="Canal">
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

/**
 * Visão do canal para o RTV — cabeçalho com back + safra + Registrar,
 * filtro global de filial, métricas e tabs Visão geral / Problemas /
 * Atividades. Sem ações de gestão (isso é do DSM/CX).
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
    ? await getPlanBoard(channel.plan.id, {
        id: channel.id,
        name: channel.name,
      })
    : { problems: [], activities: [] };

  return (
    <PageShell
      title={channel.name}
      description={`${harvestLabel(channel.plan?.harvest)} · ${channel.region} · ${channel.branches.length} ${channel.branches.length === 1 ? "filial" : "filiais"}`}
      breadcrumb={
        <div className="mb-1 flex items-center gap-2">
          <BackButton fallbackHref="/meus-canais" />
          <Breadcrumb>
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
        </div>
      }
      actions={
        <>
          <Badge variant="outline" className="hidden md:flex">
            {harvestLabel(channel.plan?.harvest)}
          </Badge>
          {board.problems.length > 0 ? (
            <ProblemsSheetButton count={board.problems.length} />
          ) : null}
          <Button
            nativeButton={false}
            render={<Link href={`/registrar?canal=${id}`} />}
            className="hidden md:flex"
          >
            <Camera className="size-4" />
            Registrar
          </Button>
        </>
      }
    >
      <MeuCanalView
        channel={channel}
        problems={board.problems}
        activities={board.activities}
        profileId={profile.id}
      />
    </PageShell>
  );
}
