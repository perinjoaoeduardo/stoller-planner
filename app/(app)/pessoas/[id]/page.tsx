import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { MyActivitiesList } from "@/app/(app)/minhas-atividades/my-activities-list";
import { PageShell } from "@/components/app/page-shell";
import { StatCard } from "@/components/shared/stat-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { daysSince, isDark } from "@/lib/db/cx";
import { getPersonDetail } from "@/lib/db/person";
import { getInitials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Perfil — Corteva Planner",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  DSM: "Gestor de canais",
  RTV: "Consultor técnico de vendas",
  RDC: "Representante de desenvolvimento",
  CX: "Excelência comercial",
};

/**
 * Perfil de pessoa — responde "como está o trabalho desta pessoa?":
 * ritmo de registro, carga, atrasos e onde ela atua.
 *
 * A tela era um mosaico: dois cards de meia largura ("Onde atua" com um
 * único canal ao lado de "Registros recentes") deixavam um buraco no
 * meio da página, e "Registros recentes" repetia — em outro formato — as
 * atividades concluídas que a lista logo abaixo já mostrava. Agora é uma
 * coluna só: números, onde atua em uma linha, e a lista canônica de
 * atividades (a mesma do resto do app).
 *
 * Escopo: CX vê qualquer pessoa; DSM só quem atua nos canais dele;
 * RTV/RDC só o próprio perfil.
 */
export default async function PessoaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentProfile();

  const person = await getPersonDetail(id);
  if (!person) notFound();

  // Guard de escopo por perfil de quem olha.
  if (viewer.role === "DSM") {
    const scoped = await getScopedChannelIds(viewer);
    const shares =
      viewer.id === person.id ||
      person.links.some((link) => scoped.includes(link.channelId));
    if (!shares) notFound();
  } else if (viewer.role !== "CX" && viewer.id !== person.id) {
    notFound();
  }

  const days = daysSince(person.lastExecutionAt);
  const dark = isDark(person.lastExecutionAt);
  const lastRegisterValue =
    days === null ? "Nunca" : days === 0 ? "Hoje" : `há ${days}d`;

  const roleDescription = ROLE_DESCRIPTIONS[person.role] ?? person.role;
  // O DSM não tem /acompanhamento — mandá-lo para lá era um beco.
  const backHref =
    viewer.role === "CX" ? "/acompanhamento?tab=pessoas" : "/canais";

  return (
    <PageShell
      backHref={backHref}
      title={
        <span className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0 border border-border">
            {person.avatarUrl ? (
              <AvatarImage src={person.avatarUrl} alt={person.name} />
            ) : null}
            <AvatarFallback className="text-sm font-medium">
              {getInitials(person.name)}
            </AvatarFallback>
          </Avatar>
          {person.name}
        </span>
      }
      // Sem badge do papel: "RTV" ao lado de "Consultor técnico de
      // vendas" era a mesma informação duas vezes, uma delas em sigla.
      description={[roleDescription, person.regionNames.join(", ")]
        .filter(Boolean)
        .join(" · ")}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Atividades na safra"
          value={person.stats.total}
          sublabel="sob responsabilidade"
        />
        <StatCard
          title="Concluídas"
          value={`${person.stats.completedPercent}%`}
          sublabel={`${person.stats.completed} de ${person.stats.total}`}
          tone="success"
        />
        <StatCard
          title="Atrasadas"
          value={person.stats.late}
          sublabel="vencidas ainda abertas"
          tone="warning"
        />
        <StatCard
          title="Último registro"
          value={lastRegisterValue}
          sublabel={dark ? "sem registro recente" : "ritmo em dia"}
          tone={dark ? "warning" : "neutral"}
        />
      </div>

      {/* Onde atua em UMA linha de chips: com um canal só, o card de
          meia tela anterior abria um buraco na página para dizer uma
          frase. */}
      {person.links.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {person.role === "DSM" ? "Canais sob gestão" : "Onde atua"}
          </p>
          <div className="flex flex-wrap gap-2">
            {person.links.map((link) => (
              <Link
                key={link.channelId}
                href={`/canais/${link.channelId}`}
                className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-border-hover hover:bg-hover-surface"
              >
                <span className="text-sm font-medium text-foreground">
                  {link.channelName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {link.branchNames.length > 0
                    ? link.branchNames.join(", ")
                    : link.regionName}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-slow ease-emphasized group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* A lista canônica, sem KPIs — os números já estão acima. */}
      <MyActivitiesList
        activities={person.activities}
        initialStatus="todas"
        showKpis={false}
      />
    </PageShell>
  );
}
