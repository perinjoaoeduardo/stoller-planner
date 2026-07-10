import { ActivityDrawerProvider } from "@/components/app/activity-drawer";
import { AppSidebar } from "@/components/app/app-sidebar";
import { ContentTopBar } from "@/components/app/content-topbar";
import { SettingsProvider } from "@/components/app/settings-provider";
import { WizardProvider } from "@/components/app/wizard-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentProfile, getScopedChannelIds } from "@/lib/auth/scope";
import { getChannelCards } from "@/lib/db/channels";

/**
 * Canais do RTV para o command palette — nome + atrasadas por canal,
 * pra ordenar o "Ir para [canal]" (críticos primeiro) e alimentar a
 * sugestão de "Atividades atrasadas (N)" no estado vazio da busca.
 */
async function getFieldChannels(
  profile: Awaited<ReturnType<typeof getCurrentProfile>>
) {
  if (profile.role !== "RTV") return [];
  const channelIds = await getScopedChannelIds(profile);
  if (channelIds.length === 0) return [];
  const cards = await getChannelCards(channelIds);
  return cards.map((card) => ({
    id: card.id,
    name: card.name,
    lateCount: card.lateCount,
  }));
}

/**
 * Layout global (padrão shadcn/create): um canvas de fundo neutro com
 * margem generosa em volta, sobre o qual flutuam dois painéis — a
 * sidebar escura à esquerda e o container de conteúdo claro à direita,
 * separados por um respiro real. Não há header full-width: marca e
 * perfil vivem na sidebar; busca e tema no topo do container. Só o
 * conteúdo rola; sidebar e busca ficam fixos.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();
  const fieldChannels = await getFieldChannels(profile);

  const user = {
    id: profile.id,
    name: profile.fullName,
    email: profile.email,
    role: profile.role,
    avatarUrl: profile.avatarUrl,
  };

  return (
    <SettingsProvider user={user}>
      <WizardProvider>
      <ActivityDrawerProvider>
      <SidebarProvider
        style={{ "--sidebar-width": "19rem" } as React.CSSProperties}
        className="h-svh overflow-hidden bg-muted dark:bg-black"
      >
        <AppSidebar
          role={profile.role}
          user={user}
          className="p-4 md:p-6"
        />
        <SidebarInset className="m-4 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-foreground/5 md:my-6 md:mr-6 md:ml-0 dark:bg-card dark:ring-white/10">
          <div className="shrink-0 border-b px-2 py-3 md:px-3">
            <ContentTopBar role={profile.role} fieldChannels={fieldChannels} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      </ActivityDrawerProvider>
      </WizardProvider>
    </SettingsProvider>
  );
}
