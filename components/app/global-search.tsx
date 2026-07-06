"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { NAV_BY_ROLE, type Role } from "@/lib/auth/nav";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export function GlobalSearch({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const navItems = NAV_BY_ROLE[role];

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function runCommand(command: () => void) {
    setOpen(false);
    command();
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="hidden h-8 w-56 items-center justify-between gap-2 border border-white/15 bg-white/10 px-2.5 text-xs font-normal text-white/70 hover:bg-white/15 hover:text-white sm:flex lg:w-64"
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" />
          Buscar no planner...
        </span>
        <KbdGroup>
          <Kbd className="border-white/20 bg-transparent text-white/70">
            Ctrl
          </Kbd>
          <Kbd className="border-white/20 bg-transparent text-white/70">K</Kbd>
        </KbdGroup>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="size-8 text-white/80 hover:bg-white/10 hover:text-white sm:hidden"
      >
        <Search className="size-4" />
        <span className="sr-only">Buscar</span>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Busca global"
        description="Busque páginas e ações rápidas"
      >
        <CommandInput placeholder="Digite um comando ou busque..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Navegação">
            {navItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
          {role === "DSM" || role === "CX" ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Ações">
                <CommandItem
                  onSelect={() => runCommand(() => router.push("/canais"))}
                >
                  <Plus />
                  Nova atividade
                  <CommandShortcut>via canal</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
