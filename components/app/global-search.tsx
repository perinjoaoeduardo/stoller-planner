"use client";

import * as React from "react";
import { SEARCH_MAX_RECENTS } from "@/lib/config";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Camera,
  CheckCircle2,
  CircleAlert,
  Clock,
  ListFilter,
  MapPin,
  Plus,
  Search,
  Settings,
  Store,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";

import { useActivityDrawer } from "@/components/app/activity-drawer";
import { useWizardProvider } from "@/components/app/wizard-provider";
import {
  StatusBadge,
  STATUS_LABELS,
  type ActivityStatus,
} from "@/components/shared/status-badge";
import { NAV_BY_ROLE, ROLE_LABELS, type Role } from "@/lib/auth/nav";
import { searchGlobal } from "@/lib/actions/search";
import type { GlobalSearchResults } from "@/lib/db/search";
import { formatRelativeDue } from "@/lib/plan-utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
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
 * resultados ao vivo do banco — atividades, canais, filiais, metas,
 * pessoas e regiões — sempre respeitando o escopo do perfil logado.
 *
 * O RTV tem um estado vazio próprio com hierarquia: Sugestões
 * (contextual) → Navegação → Ir para canal → Ações (last resort). Com
 * query, os grupos seguem a ordem de relevância pro campo: Atividades →
 * Metas → Canais → resto. Atividades abrem o drawer (não navegam).
 */

const RECENT_KEY = "planner-recent-searches";

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
    ].slice(0, SEARCH_MAX_RECENTS);
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
  if (q.includes("planejad") || q.includes("pendente")) hits.push("planejada");
  if (q.includes("cancel") || q.includes("nao feita"))
    hits.push("nao_feita");
  return hits;
}

/** Ícone contextual da atividade conforme o status. */
function activityStatusIcon(status: ActivityStatus): LucideIcon {
  if (status === "concluida") return CheckCircle2;
  if (status === "atrasada" || status === "nao_feita") return CircleAlert;
  return Clock;
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
  /** Canais vinculados do RTV — viram "Ir para [canal]" e alimentam as sugestões. */
  fieldChannels?: { id: string; name: string; lateCount?: number }[];
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
  const { openWizard } = useWizardProvider();
  const { openActivity } = useActivityDrawer();

  const navRoutes = NAV_BY_ROLE[role];
  const isField = role === "RTV";
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
    }, 150);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const results =
    hasQuery && snapshot?.query === trimmed ? snapshot.data : null;
  const searching = hasQuery && results === null;
  const statusFilters = hasQuery ? detectStatusFilters(trimmed) : [];

  const normalizedQuery = normalize(trimmed);
  const navMatches = hasQuery
    ? navRoutes.filter((item) =>
        normalize(item.title).includes(normalizedQuery)
      )
    : navRoutes;
  // "Ir para [canal]" do RTV — casa pelo nome do canal ou por "ir".
  const channelMatches = isField
    ? hasQuery
      ? fieldChannels.filter((channel) =>
          normalize(`ir para ${channel.name}`).includes(normalizedQuery)
        )
      : fieldChannels
    : [];

  const overdueCount = fieldChannels.reduce(
    (sum, c) => sum + (c.lateCount ?? 0),
    0
  );

  const totalHits = results
    ? results.activities.length +
      results.channels.length +
      results.branches.length +
      results.problems.length +
      results.people.length
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

  /** Fecha o Command antes de acionar drawer/wizard (evita conflito de foco). */
  function runAction(fn: () => void) {
    setOpen(false);
    fn();
  }

  function selectActivity(id: string) {
    // Ver atividade = abrir o painel (modal), nunca a página cheia —
    // vale pra todos os perfis (RTV, DSM, CX).
    saveRecent(trimmed);
    setRecents(readRecents());
    runAction(() => openActivity(id));
  }

  // RTV navega para a visão de campo do canal, não para o cockpit.
  const channelHref = (channelId: string) =>
    isField ? `/meus-canais/${channelId}` : `/canais/${channelId}`;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => handleOpenChange(true)}
        className="hidden h-9 w-full items-center justify-between gap-2 border-border bg-card px-3 text-sm font-normal text-muted-foreground hover:border-border-hover hover:bg-card hover:text-foreground sm:flex"
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
        description="Busque atividades, canais, metas e pessoas"
        className="sm:max-w-[554px]"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar atividades, canais, metas..."
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
              <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                <Search className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum resultado para “{trimmed}”
                </p>
                <p className="text-xs text-muted-foreground">
                  Tente buscar por atividade, canal ou meta.
                </p>
              </div>
            ) : null}

            {/* ══ Estado COM query ══════════════════════════════════════ */}
            {hasQuery ? (
              <>
                {/* Filtros inteligentes por palavra de status */}
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
                        Ver atividades {STATUS_LABELS[status].toLowerCase()}
                        <StatusBadge status={status} className="ml-auto" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}

                {/* Atividades */}
                {results && results.activities.length > 0 ? (
                  <CommandGroup heading="Atividades">
                    {results.activities.map((activity) => {
                      const Icon = activityStatusIcon(activity.status);
                      return (
                        <CommandItem
                          key={`atividade-${activity.id}`}
                          value={`atividade-${activity.id}`}
                          onSelect={() => selectActivity(activity.id)}
                        >
                          <Icon />
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
                      );
                    })}
                  </CommandGroup>
                ) : null}

                {/* Metas do plano */}
                {results && results.problems.length > 0 ? (
                  <CommandGroup heading="Metas do plano">
                    {results.problems.map((problem) => (
                      <CommandItem
                        key={`problema-${problem.id}`}
                        value={`problema-${problem.id}`}
                        onSelect={() => go(channelHref(problem.channelId), true)}
                      >
                        <Target />
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

                {/* Canais */}
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

                {/* Filiais */}
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

                {/* Pessoas (DSM/CX) */}
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

                {/* Navegação e ações que casam com a query */}
                {navMatches.length > 0 || channelMatches.length > 0 ? (
                  <CommandGroup heading="Navegação e ações">
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
              </>
            ) : isField ? (
              /* ══ Estado VAZIO — RTV ═════════════════════════════════ */
              <>
                {recents.length > 0 ? (
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

                <CommandGroup heading="Sugestões">
                  {overdueCount > 0 ? (
                    <CommandItem
                      value="sugestao-atrasadas"
                      onSelect={() =>
                        go("/minhas-atividades?status=atrasadas")
                      }
                    >
                      <CircleAlert className="text-warning" />
                      Atividades atrasadas
                      <span className="ml-1.5 text-xs font-medium text-warning tabular-nums">
                        {overdueCount}
                      </span>
                    </CommandItem>
                  ) : null}
                  <CommandItem
                    value="sugestao-agendar"
                    onSelect={() => runAction(() => openWizard({ mode: "agendar" }))}
                  >
                    <Calendar />
                    Agendar atividade
                  </CommandItem>
                  <CommandItem
                    value="sugestao-registrar"
                    onSelect={() =>
                      runAction(() => openWizard({ mode: "registrar" }))
                    }
                  >
                    <Camera />
                    Registrar execução
                  </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Ações">
                  <CommandItem
                    value="acao-nova-atividade"
                    onSelect={() => runAction(() => openWizard())}
                  >
                    <Plus />
                    Nova atividade
                  </CommandItem>
                  <CommandItem
                    value="acao-configuracoes"
                    onSelect={() =>
                      runAction(() => onOpenSettings?.())
                    }
                  >
                    <Settings />
                    Abrir configurações
                  </CommandItem>
                </CommandGroup>
              </>
            ) : (
              /* ══ Estado VAZIO — DSM / CX ════════════════════════════ */
              <>
                {recents.length > 0 ? (
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

                <CommandGroup heading="Navegação">
                  {navRoutes.map((item) => (
                    <CommandItem
                      key={item.href}
                      value={`nav-${item.href}`}
                      onSelect={() => go(item.href)}
                    >
                      <item.icon />
                      {item.title}
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Ações">
                  <CommandItem
                    value="acao-registrar"
                    onSelect={() => go("/registrar")}
                  >
                    <Plus />
                    Registrar execução
                  </CommandItem>
                  <CommandItem
                    value="acao-nova-atividade"
                    onSelect={() => runAction(() => openWizard())}
                  >
                    <Plus />
                    Nova atividade
                  </CommandItem>
                  <CommandItem
                    value="acao-atividades-atrasadas"
                    onSelect={() => go("/atividades?status=atrasada")}
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
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
