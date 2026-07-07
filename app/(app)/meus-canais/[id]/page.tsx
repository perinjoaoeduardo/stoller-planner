import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Canal — Corteva Planner",
};

/**
 * STUB navegável do detalhe do canal do RTV — conteúdo real na Parte 2.
 */
export default async function MeuCanalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (profile.role === "DSM" || profile.role === "CX") {
    redirect(`/canais/${id}`);
  }

  const channelIds = await getScopedChannelIds(profile);
  if (!channelIds.includes(id)) notFound();

  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!channel) notFound();

  return (
    <PageShell
      title={channel.name}
      description="Detalhe do canal para o campo."
    >
      <Empty className="flex-1 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store />
          </EmptyMedia>
          <EmptyTitle>Em construção</EmptyTitle>
          <EmptyDescription>
            Em breve você verá aqui o plano e as atividades deste canal.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </PageShell>
  );
}
