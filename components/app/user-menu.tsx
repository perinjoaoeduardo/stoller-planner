"use client";

import { LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Usuária demo até o auth real ser ligado
const CURRENT_USER = {
  name: "Camila Duarte",
  role: "CX",
  initials: "CD",
};

export function UserMenu() {
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
              <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                {CURRENT_USER.initials}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">Menu do usuário</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{CURRENT_USER.name}</span>
          <Badge variant="secondary">{CURRENT_USER.role}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
