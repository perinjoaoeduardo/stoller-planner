import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentProfile } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus Canais — Corteva Planner",
};

/**
 * STUB navegável — o conteúdo real de "Meus Canais" do RTV chega na
 * Parte 2 do redesign. DSM/CX continuam usando /canais.
 */
export default async function MeusCanaisPage() {
  const profile = await getCurrentProfile();
  if (profile.role === "DSM" || profile.role === "CX") redirect("/canais");

  return (
    <PageShell
      title="Meus Canais"
      description="Os canais e filiais em que você atua nesta safra."
    >
      <Empty className="flex-1 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store />
          </EmptyMedia>
          <EmptyTitle>Em construção</EmptyTitle>
          <EmptyDescription>
            Em breve você verá aqui o resumo de cada canal em que atua.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </PageShell>
  );
}
