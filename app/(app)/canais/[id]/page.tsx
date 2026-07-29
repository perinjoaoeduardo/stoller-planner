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
import {
  canEditPlan,
  getCurrentProfile,
  getScopedChannelIds,
} from "@/lib/auth/scope";
import {
  getChannelDetail,
  getChannelResponsibles,
  getPlanBoard,
} from "@/lib/db/channels";
import { getChannelNotes } from "@/lib/db/notes";

import { ChannelView } from "./channel-view";

export const dynamic = "force-dynamic";

/** 404 amigável: canal inexistente OU fora do escopo do usuário. */
function ChannelNotFound() {
  return (
    <PageShell title="Canal" description="Detalhe do plano da safra.">
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
              <Button variant="outline" nativeButton={false} render={<Link href="/canais" />}>
                Voltar para canais
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export const metadata: Metadata = {
  title: "Canal — Corteva PED",
};

export default async function CanalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);

  // Validação de escopo NO SERVIDOR: fora do escopo = mesmo 404 amigável.
  if (!channelIds.includes(id)) return <ChannelNotFound />;

  const channel = await getChannelDetail(id);
  if (!channel) return <ChannelNotFound />;

  const [board, responsibles, canEdit, notes] = await Promise.all([
    channel.plan
      ? getPlanBoard(channel.plan.id, { id: channel.id, name: channel.name })
      : Promise.resolve({ problems: [], activities: [] }),
    getChannelResponsibles(
      channel.id,
      channel.branches.map((branch) => branch.id)
    ),
    canEditPlan(profile, channel.id),
    getChannelNotes(channel.id),
  ]);

  return (
    <ChannelView
      channel={channel}
      problems={board.problems}
      activities={board.activities}
      responsibles={responsibles}
      canEdit={canEdit}
      notes={notes}
      currentUserId={profile.id}
      currentUser={{ name: profile.fullName, avatarUrl: profile.avatarUrl }}
    />
  );
}
