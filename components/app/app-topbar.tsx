"use client";

import * as React from "react";

import { BrandLogo } from "@/components/app/brand-logo";
import { GlobalSearch } from "@/components/app/global-search";
import {
  SettingsDialog,
  type SettingsUser,
} from "@/components/app/settings-dialog";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Top bar contrastante: escura no modo claro, elevação clara no modo escuro.
 * Também hospeda o modal de Configurações (aberto pelo avatar ou Ctrl+K).
 */
export function AppTopbar({
  user,
  fieldChannels = [],
}: {
  user: SettingsUser;
  /** Canais do RTV/RDC para os itens "Ir para [canal]" da busca. */
  fieldChannels?: { id: string; name: string }[];
}) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <header className="z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-white/10 bg-zinc-950 px-4 text-zinc-50 md:px-6 dark:bg-zinc-900">
      <SidebarTrigger className="size-8 text-white/80 hover:bg-white/10 hover:text-white" />
      <Separator orientation="vertical" className="mr-1 h-5! bg-white/15" />
      <BrandLogo className="text-zinc-50" />
      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        <GlobalSearch
          role={user.role}
          fieldChannels={fieldChannels}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
        <UserMenu user={user} onOpenSettings={() => setSettingsOpen(true)} />
      </div>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
      />
    </header>
  );
}
