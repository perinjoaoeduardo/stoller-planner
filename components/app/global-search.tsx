"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChartColumn,
  ClipboardList,
  Home,
  Plus,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";

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

const NAV_ITEMS = [
  { label: "Início", href: "/", icon: Home },
  { label: "Canais", href: "/canais", icon: Store },
  { label: "Atividades", href: "/atividades", icon: ClipboardList },
  { label: "Relatórios", href: "/relatorios", icon: ChartColumn },
];

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

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
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Ações">
            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  toast("Nova atividade", {
                    description: "Ação disponível em um próximo bloco.",
                  })
                )
              }
            >
              <Plus />
              Nova atividade
              <CommandShortcut>Em breve</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
