import type { Metadata } from "next";

import { PageShell } from "@/components/app/page-shell";
import {
  canEditPlan,
  getCurrentProfile,
  getScopedChannelIds,
} from "@/lib/auth/scope";
import { getChannelDetail } from "@/lib/db/channels";
import { getAssignablePeople, getChannelTeam } from "@/lib/db/channel-people";

import { TeamManager } from "./team-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Time do canal — Corteva Planner",
};

/**
 * /canais/[id]/pessoas — quem atua no canal e a manutenção do vínculo.
 *
 * Tela própria (e não uma aba do cockpit) porque é trabalho de cadastro:
 * acontece de vez em quando, tem seus próprios diálogos e não compete
 * com a leitura diária do plano.
 */
export default async function CanalPessoasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(id)) {
    return (
      <PageShell
        title="Canal não encontrado"
        description="Este canal não está no seu escopo."
      >
        <div />
      </PageShell>
    );
  }

  const [channel, team, assignable, canEdit] = await Promise.all([
    getChannelDetail(id),
    getChannelTeam(id),
    getAssignablePeople(),
    canEditPlan(profile, id),
  ]);

  if (!channel) {
    return (
      <PageShell
        title="Canal não encontrado"
        description="Este canal não existe mais."
      >
        <div />
      </PageShell>
    );
  }

  return (
    <PageShell
      backHref={`/canais/${id}`}
      title="Time do canal"
      description={`Quem atua em ${channel.name} e com que carga.`}
    >
      <TeamManager
        channelId={id}
        channelName={channel.name}
        people={team.people}
        branches={team.branches}
        assignable={assignable}
        canEdit={canEdit}
      />
    </PageShell>
  );
}
