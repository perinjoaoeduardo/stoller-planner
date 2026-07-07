"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  Clock,
  ListFilter,
  MapPin,
  Map as MapIcon,
  Plus,
  Search,
  Settings,
  Store,
  User,
} from "lucide-react";

import {
  StatusBadge,
  STATUS_LABELS,
  type ActivityStatus,
} from "@/components/app/status-badge";
import { NAV_BY_ROLE, ROLE_LABELS, type Role } from "@/lib/auth/nav";
import { searchGlobal } from "@/lib/actions/search";
import type { GlobalSearchResults } from "@/lib/db/search";
import { formatRelativeDue } from "@/lib/plan-utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";

/**
 * Busca global (Ctrl+K): navegação, ações rápidas, buscas recentes e
 * resultados ao vivo do banco — atividades, canais, filiais, problemas,
 * pessoas e regiões — sempre respeitando o escopo do perfil logado.
 * Palavras de status ("atrasada", "concluída"...) viram filtros diretos.
 */

const RECENT_KEY = "planner-recent-searches";
const MAX_RECENTS = 5;

function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  try {
    const next = [
      trimmed,
      ...readRecents().filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase()
      ),
    ].slice(0, MAX_RECENTS);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage indisponível — buscas recentes ficam só na sessão.
  }
}

/** minúsculas + sem acentos, para casar "concluída" com "concluida". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Palavras de status na query viram atalhos de filtro da tabela. */
function detectStatusFilters(query: string): ActivityStatus[] {
  const q = normalize(query);
  const hits: ActivityStatus[] = [];
  if (q.includes("atras")) hits.push("atrasada");
  if (q.includes("conclu")) hits.push("concluida");
  if (q.includes("andamento")) hits.push("em_andamento");
  if (q.includes("planejad") || q.includes("pendente")) hits.push("planejada");
  if (q.includes("nao feita") || q.includes("nao-feita"))
    hits.push("nao_feita");
  return hits;
}

const EMPTY_RESULTS: GlobalSearchResults = {
  activities: [],
  channels: [],
  branches: [],
  problems: [],
  people: [],
  regions: [],
};

export function GlobalSearch({
  role,
  fieldChannels = [],
  onOpenSettings,
}: {
  role: Role;
  /** Canais vinculados do RTV/RDC — viram itens "Ir para [canal]". */
  fieldChannels?: { id: string; name: string }[];
  onOpenSettings?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [snapshot, setSnapshot] = React.useState<{
    query: string;
    data: GlobalSearchResults;
  } | null>(null);
  const [recents, setRecents] = React.useState<string[]>(() =>
    typeof window === "undefined" ? [] : readRecents()
  );
  const requestRef = React.useRef(0);
  const router = useRouter();

  const navItems = NAV_BY_ROLE[role];
  const isField = role === "RTV" || role === "RDC";
  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;

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

  // Busca no servidor com debounce; respostas fora de ordem são descartadas.
  React.useEffect(() => {
    if (trimmed.length < 2) return;
    const id = ++requestRef.current;
    const timer = setTimeout(() => {
      searchGlobal(trimmed)
        .then((data) => {
          if (requestRef.current === id) {
            setSnapshot({ query: trimmed, data });
          }
        })
        .catch(() => {
          if (requestRef.current === id) {
            setSnapshot({ query: trimmed, data: EMPTY_RESULTS });
          }
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const results =
    hasQuery && snapshot?.query === trimmed ? snapshot.data : null;
  const searching = hasQuery && results === null;
  const statusFilters = hasQuery ? detectStatusFilters(trimmed) : [];

  const normalizedQuery = normalize(trimmed);
  const navMatches = hasQuery
    ? navItems.filter((item) => normalize(item.title).includes(normalizedQuery))
    : navItems;
  // "Ir para [canal]" do RTV/RDC — casa pelo nome do canal ou por "ir".
  const channelMatches = isField
    ? hasQuery
      ? fieldChannels.filter((channel) =>
          normalize(`ir para ${channel.name}`).includes(normalizedQuery)
        )
      : fieldChannels
    : [];

  const totalHits = results
    ? results.activities.length +
      results.channels.length +
      results.branches.length +
      results.problems.length +
      results.people.length +
      results.regions.length
    : 0;
  const nothingToShow =
    hasQuery &&
    !searching &&
    totalHits === 0 &&
    navMatches.length === 0 &&
    channelMatches.length === 0 &&
    statusFilters.length === 0;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      setRecents(readRecents());
    }
  }

  function go(href: string, remember = false) {
    if (remember) {
      saveRecent(trimmed);
      setRecents(readRecents());
    }
    setOpen(false);
    router.push(href);
  }

  // RTV/RDC navegam para a visão de campo do canal, não para o cockpit.
  const channelHref = (channelId: string) =>
    isField ? `/meus-canais/${channelId}` : `/canais/${channelId}`;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => handleOpenChange(true)}
        className="hidden h-9 w-full items-center justify-between gap-2 bg-muted/40 px-3 text-sm font-normal text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          Buscar no planner...
        </span>
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleOpenChange(true)}
        className="size-9 sm:hidden"
      >
        <Search className="size-4" />
        <span className="sr-only">Buscar</span>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Busca global"
        description="Busque atividades, canais, filiais, pessoas e ações"
        className="sm:max-w-[554px]"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar atividades, canais, filiais, pessoas..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[389px]">
            {searching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Buscando...
              </div>
            ) : null}

            {nothingToShow ? (
              <CommandEmpty>
                Nada encontrado para “{trimmed}”. Tente o nome de uma
                atividade, canal, filial ou pessoa.
              </CommandEmpty>
            ) : null}

            {/* ── Filtros inteligentes por palavra de status ─────────── */}
            {statusFilters.length > 0 ? (
              <CommandGroup heading="Filtros rápidos">
                {statusFilters.map((status) => (
                  <CommandItem
                    key={`filtro-${status}`}
                    value={`filtro-${status}`}
                    onSelect={() =>
                      go(
                        isField
                          ? "/minhas-atividades"
                          : `/atividades?status=${status}`,
                        true
                      )
                    }
                  >
                    <ListFilter />
                    Ver atividades{" "}
                    {STATUS_LABELS[status].toLowerCase()}
                    <StatusBadge status={status} className="ml-auto" />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {/* ── Resultados do banco ────────────────────────────────── */}
            {results && results.activities.length > 0 ? (
              <CommandGroup heading="Atividades">
                {results.activities.map((activity) => (
                  <CommandItem
                    key={`atividade-${activity.id}`}
                    value={`atividade-${activity.id}`}
                    onSelect={() => go(`/atividades/${activity.id}`, true)}
                  >
                    <Clock />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{activity.title}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {activity.channelName}
                        {activity.branchName
                          ? ` · ${activity.branchName}`
                          : ""}
                        {activity.dueDate
                          ? ` · ${formatRelativeDue(activity.dueDate)}`
                          : ""}
                      </span>
                    </span>
                    <StatusBadge
                      status={activity.status}
                      className="ml-2 shrink-0"
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {results && results.channels.length > 0 ? (
              <CommandGroup heading="Canais">
                {results.channels.map((channel) => (
                  <CommandItem
                    key={`canal-${channel.id}`}
                    value={`canal-${channel.id}`}
                    onSelect={() => go(channelHref(channel.id), true)}
                  >
                    <Store />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{channel.name}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {channel.regionName}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {results && results.branches.length > 0 ? (
              <CommandGroup heading="Filiais">
                {results.branches.map((branch) => (
                  <CommandItem
                    key={`filial-${branch.id}`}
                    value={`filial-${branch.id}`}
                    onSelect={() => go(channelHref(branch.channelId), true)}
                  >
                    <MapPin />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">
                        {branch.name} · {branch.city}
                      </span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {branch.channelName}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {results && results.problems.length > 0 ? (
              <CommandGroup heading="Problemas do plano">
                {results.problems.map((problem) => (
                  <CommandItem
                    key={`problema-${problem.id}`}
                    value={`problema-${problem.id}`}
                    onSelect={() => go(`/canais/${problem.channelId}`, true)}
                  >
                    <CircleAlert />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{problem.title}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {problem.channelName}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {results && results.people.length > 0 ? (
              <CommandGroup heading="Pessoas">
                {results.people.map((person) => (
                  <CommandItem
                    key={`pessoa-${person.id}`}
                    value={`pessoa-${person.id}`}
                    onSelect={() =>
                      go(`/atividades?responsavel=${person.id}`, true)
                    }
                  >
                    <User />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{person.name}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {ROLE_LABELS[person.role as Role] ?? person.role}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {results && results.regions.length > 0 ? (
              <CommandGroup heading="Regiões">
                {results.regions.map((region) => (
                  <CommandItem
                    key={`regiao-${region.id}`}
                    value={`regiao-${region.id}`}
                    onSelect={() => go(`/regioes/${region.id}`, true)}
                  >
                    <MapIcon />
                    {region.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {/* ── Buscas recentes (sem query) ────────────────────────── */}
            {!hasQuery && recents.length > 0 ? (
              <>
                <CommandGroup heading="Buscas recentes">
                  {recents.map((recent) => (
                    <CommandItem
                      key={`recente-${recent}`}
                      value={`recente-${recent}`}
                      onSelect={() => setQuery(recent)}
                    >
                      <Search />
                      {recent}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            ) : null}

            {/* ── Navegação ──────────────────────────────────────────── */}
            {navMatches.length > 0 || channelMatches.length > 0 ? (
              <CommandGroup heading="Navegação">
                {navMatches.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`nav-${item.href}`}
                    onSelect={() => go(item.href)}
                  >
                    <item.icon />
                    {item.title}
                  </CommandItem>
                ))}
                {channelMatches.map((channel) => (
                  <CommandItem
                    key={`nav-canal-${channel.id}`}
                    value={`nav-canal-${channel.id}`}
                    onSelect={() => go(`/meus-canais/${channel.id}`)}
                  >
                    <Store />
                    Ir para {channel.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {/* ── Ações rápidas (sem query) ──────────────────────────── */}
            {!hasQuery ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Ações">
                  <CommandItem
                    value="acao-registrar"
                    onSelect={() => go("/registrar")}
                  >
                    <Plus />
                    Registrar execução
                  </CommandItem>
                  {role === "DSM" || role === "CX" ? (
                    <CommandItem
                      value="acao-nova-atividade"
                      onSelect={() => go("/canais")}
                    >
                      <Plus />
                      Nova atividade
                    </CommandItem>
                  ) : null}
                  <CommandItem
                    value="acao-atividades-atrasadas"
                    onSelect={() =>
                      go(
                        isField
                          ? "/minhas-atividades"
                          : "/atividades?status=atrasada"
                      )
                    }
                  >
                    <ListFilter />
                    Atividades atrasadas
                  </CommandItem>
                  <CommandItem
                    value="acao-configuracoes"
                    onSelect={() => {
                      setOpen(false);
                      onOpenSettings?.();
                    }}
                  >
                    <Settings />
                    Abrir configurações
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
