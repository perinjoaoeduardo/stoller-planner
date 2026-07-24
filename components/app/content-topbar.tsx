"use client";

import { GlobalSearch } from "@/components/app/global-search";
import { NewActivityButton } from "@/components/app/new-activity-button";
import { useOpenSettings } from "@/components/app/settings-provider";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import type { Role } from "@/lib/auth/nav";

/**
 * Primeira linha do container de conteúdo: busca global + a ação
 * universal "Nova atividade" à esquerda, toggle de tema à direita.
 * "Nova atividade" vive aqui (e só aqui como ação global) porque criar
 * atividade não pertence a nenhuma tela — é transversal ao app. O avatar
 * não vive mais aqui — mudou para o rodapé da sidebar. No mobile aparece
 * o SidebarTrigger e a ação vira só o ícone "+" para caber.
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
      {/* Ação universal — label no desktop, só ícone no mobile. */}
      <NewActivityButton size="sm" className="hidden shrink-0 sm:flex" />
      <NewActivityButton
        size="icon-sm"
        label=""
        className="shrink-0 sm:hidden"
      />
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
