"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/app/brand-logo";
import { NavUser } from "@/components/app/nav-user";
import type { SettingsUser } from "@/components/app/settings-dialog";
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { NavItem } from "@/lib/auth/nav";

/**
 * Sidebar flutuante escura (padrão shadcn/create): marca + toggle no
 * topo, navegação por perfil no meio e o perfil do usuário fixo no
 * rodapé. Não há header full-width — todas essas responsabilidades
 * vivem aqui dentro. "Nova atividade" não é item de menu: virou ação
 * universal no topbar (ao lado da busca).
 */
export function AppSidebar({
  role,
  user,
  inboxCount = 0,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  role: Role;
  user: SettingsUser;
  /** Envios do próprio usuário esperando triagem. Zero não renderiza. */
  inboxCount?: number;
}) {
  const pathname = usePathname();
  const navItems = NAV_BY_ROLE[role];

  function renderMenuItem(item: NavItem) {
    // Badge neutro, sem cor de alarme: a fila da caixa de entrada é
    // trabalho normal, não incidente. Zero some por completo — "0" na
    // navegação é ruído que o usuário aprende a ignorar.
    const badge =
      item.href === "/caixa-de-entrada" && inboxCount > 0 ? inboxCount : null;

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={pathname === item.href}
          render={
            <Link href={item.href}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          }
        />
        {badge ? (
          <SidebarMenuBadge className="tabular-nums">{badge}</SidebarMenuBadge>
        ) : null}
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
          <SidebarTrigger className="text-sidebar-foreground/70 hover:bg-card/10 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{navItems.map(renderMenuItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Footer — separador sutil acima pra descolar do último grupo */}
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
