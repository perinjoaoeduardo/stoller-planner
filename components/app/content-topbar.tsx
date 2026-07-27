"use client";

import { GlobalSearch } from "@/components/app/global-search";
import { NewActivityButton } from "@/components/app/new-activity-button";
import { useOpenSettings } from "@/components/app/settings-provider";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import type { Role } from "@/lib/auth/nav";
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
      <div className="ml-auto flex items-center gap-2">
        <NewActivityButton size="sm" className="hidden shrink-0 sm:flex" />
        <NewActivityButton
          size="icon-sm"
          label=""
          className="shrink-0 sm:hidden"
        />
      </div>
    </div>
  );
}
