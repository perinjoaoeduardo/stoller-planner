"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/app/brand-logo";
import { NavUser } from "@/components/app/nav-user";
import type { SettingsUser } from "@/components/app/settings-dialog";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { NAV_BY_ROLE, type Role } from "@/lib/auth/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { NavItem } from "@/lib/auth/nav";

/**
 * Sidebar flutuante escura (padrão shadcn/create): marca + toggle no
 * topo, navegação por perfil no meio e o perfil do usuário fixo no
 * rodapé. Não há header full-width — todas essas responsabilidades
 * vivem aqui dentro.
 */
export function AppSidebar({
  role,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { role: Role; user: SettingsUser }) {
  const pathname = usePathname();
  const navItems = NAV_BY_ROLE[role];
  const { openWizard } = useWizardProvider();

  // Ações (ex.: Nova atividade) vivem num subgrupo separado; o resto é
  // navegação. Estrutura idêntica pra DSM/CX se um dia ganharem ações.
  const actionItems = navItems.filter((item) => item.action);
  const navigationItems = navItems.filter((item) => !item.action);

  function renderMenuItem(item: NavItem) {
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={!item.action && pathname === item.href}
          render={
            item.action === "wizard" ? (
              <button type="button" onClick={() => openWizard()}>
                <item.icon />
                <span>{item.title}</span>
              </button>
            ) : (
              <Link href={item.href}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            )
          }
        />
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      {/* Header — separador sutil abaixo pra descolar do primeiro grupo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-1 py-1">
          <Link
            href="/"
            className="flex min-w-0 items-center group-data-[collapsible=icon]:hidden"
          >
            <BrandLogo className="text-sidebar-foreground" />
          </Link>
          <Link
            href="/"
            className="hidden group-data-[collapsible=icon]:flex"
            aria-label="Início"
          >
            <BrandLogo variant="icon" className="text-sidebar-foreground" />
          </Link>
          <SidebarTrigger className="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{navigationItems.map(renderMenuItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {actionItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Ações</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{actionItems.map(renderMenuItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      {/* Footer — separador sutil acima pra descolar do último grupo */}
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
