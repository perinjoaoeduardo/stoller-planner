import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentProfile } from "@/lib/auth/scope";

/**
 * Layout em 3 camadas: header full-width no topo, e abaixo dois
 * painéis flutuantes (sidebar + container de conteúdo) separados por
 * um respiro de 8px onde o fundo neutro aparece. Só o conteúdo rola;
 * header e sidebar ficam fixos.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <SidebarProvider
      style={{ "--header-height": "4rem" } as React.CSSProperties}
      className="h-svh flex-col overflow-hidden bg-muted dark:bg-black"
    >
      <AppTopbar
        user={{
          id: profile.id,
          name: profile.fullName,
          email: profile.email,
          role: profile.role,
          avatarUrl: profile.avatarUrl,
        }}
      />
      <div className="flex min-h-0 flex-1">
        <AppSidebar role={profile.role} />
        {/* min-w-0 impede que conteúdo largo (svgs de charts) trave o flex */}
        <SidebarInset className="min-h-0 min-w-0 overflow-y-auto bg-background md:my-2 md:mr-2 md:ml-0 md:rounded-2xl md:shadow-sm md:ring-1 md:ring-foreground/5 dark:md:ring-foreground/10">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
