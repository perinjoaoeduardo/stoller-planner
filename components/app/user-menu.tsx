"use client";

import * as React from "react";
import { LogOut, Settings } from "lucide-react";

import type { SettingsUser } from "@/components/app/settings-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";

export type UserMenuUser = SettingsUser;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

export function UserMenu({
  user,
  onOpenSettings,
}: {
  user: UserMenuUser;
  onOpenSettings?: () => void;
}) {
  const [pending, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full hover:bg-white/10"
          >
            <Avatar className="size-8 border border-white/20">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">Menu do usuário</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-start justify-between gap-2 font-normal">
            <span className="grid gap-0.5">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <Badge variant="secondary">{user.role}</Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onOpenSettings?.()}>
          <Settings />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
        >
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
