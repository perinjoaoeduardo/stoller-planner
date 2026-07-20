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
import { getChannelNotes } from "@/lib/db/notes";
import { createClient } from "@/lib/supabase/server";

import { NotesView } from "./notes-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notas do canal — Corteva Planner",
};

/**
 * /canais/[id]/notas — feed de notas do canal.
 * Aberto a qualquer perfil com o canal no escopo (RTV, DSM e CX
 * alimentam o mesmo feed).
 */
export default async function NotasPage({
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
        title="Notas do canal"
        description="Aprendizados e observações do time sobre o cliente."
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
                  Este canal não existe ou não faz parte da sua carteira.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/canais" />}
                >
                  Voltar para canais
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const supabase = await createClient();
  const [{ data: channel }, notes] = await Promise.all([
    supabase.from("channels").select("id, name").eq("id", id).maybeSingle(),
    getChannelNotes(id),
  ]);

  const isField = profile.role === "RTV";

  return (
    <PageShell
      backHref={`${isField ? "/meus-canais" : "/canais"}/${id}`}
      title="Notas do canal"
      description={
        channel
          ? `Aprendizados e observações do time sobre ${channel.name}.`
          : "Aprendizados e observações do time sobre o cliente."
      }
    >
      <NotesView
        channelId={id}
        notes={notes}
        currentUserId={profile.id}
        currentUser={{
          name: profile.fullName,
          avatarUrl: profile.avatarUrl,
        }}
      />
    </PageShell>
  );
}
