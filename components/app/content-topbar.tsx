"use client";

import { GlobalSearch } from "@/components/app/global-search";
import { useOpenSettings } from "@/components/app/settings-provider";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import type { Role } from "@/lib/auth/nav";

/**
 * Primeira linha do container de conteúdo: busca global à esquerda
 * (~metade da largura) e toggle de tema à direita. O avatar não vive
 * mais aqui — mudou para o rodapé da sidebar. No mobile aparece o
 * SidebarTrigger (o cabeçalho da sidebar fica escondido no Drawer);
 * no desktop o trigger vive dentro da própria sidebar.
 */
export function ContentTopBar({
  role,
  fieldChannels = [],
}: {
  role: Role;
  fieldChannels?: { id: string; name: string; lateCount?: number }[];
}) {
  const openSettings = useOpenSettings();
  const { state, isMobile } = useSidebar();
  const showTrigger = isMobile || state === "collapsed";

  return (
    <div className="flex items-center gap-2">
      {showTrigger ? <SidebarTrigger className="size-9 shrink-0" /> : null}
      <div className="w-full max-w-md">
        <GlobalSearch
          role={role}
          fieldChannels={fieldChannels}
          onOpenSettings={() => openSettings?.()}
        />
      </div>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
