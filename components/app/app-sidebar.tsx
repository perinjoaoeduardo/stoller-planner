"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  SidebarRail,
} from "@/components/ui/sidebar";

/**
 * Sidebar flutuante (variant floating): painel arredondado com sombra
 * sobre o fundo neutro, começando abaixo do header full-width
 * (offset via --header-height definido no layout). O logo vive no
 * header — aqui fica só o contexto da safra e a navegação por perfil.
 */
export function AppSidebar({
  role,
  ...props
}: React.ComponentProps<typeof Sidebar> & { role: Role }) {
  const pathname = usePathname();
  const navItems = NAV_BY_ROLE[role];

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]"
      {...props}
    >
      <SidebarHeader>
        <span className="px-3 pt-1 text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
          Safra 2025/26
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
