"use client";

import { BrandLogo } from "@/components/app/brand-logo";
import { GlobalSearch } from "@/components/app/global-search";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UserMenu, type UserMenuUser } from "@/components/app/user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Top bar contrastante: escura no modo claro, elevação clara no modo escuro.
 */
export function AppTopbar({ user }: { user: UserMenuUser }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-zinc-950 px-3 text-zinc-50 md:px-4 dark:bg-zinc-900">
      <SidebarTrigger className="size-8 text-white/80 hover:bg-white/10 hover:text-white" />
      <Separator orientation="vertical" className="mr-1 h-5! bg-white/15" />
      <BrandLogo className="text-zinc-50" />
      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        <GlobalSearch role={user.role} />
        <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
