"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ClipboardPlus, ListTodo, RefreshCw, SearchX } from "lucide-react";

import { ActivityCard } from "@/components/app/activity-card";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ActivityRow } from "@/lib/db/channels";
import { cn } from "@/lib/utils";

type StatusChip = "abertas" | "concluidas" | "todas";

const CHIPS: { value: StatusChip; label: string }[] = [
  { value: "abertas", label: "Abertas" },
  { value: "concluidas", label: "Concluídas" },
  { value: "todas", label: "Todas" },
];

const OPEN = new Set(["planejada", "em_andamento", "atrasada"]);

/**
 * Ordenação da lista pessoal: atrasadas (mais dias de atraso primeiro),
 * depois abertas (prazo mais próximo), depois concluídas (recentes).
 */
function sortActivities(activities: ActivityRow[]): ActivityRow[] {
  const rank = (activity: ActivityRow) => {
    if (activity.status === "atrasada") return 0;
    if (OPEN.has(activity.status)) return 1;
    return 2;
  };
  return [...activities].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    if (rank(a) === 2) {
      // Encerradas: mais recentes primeiro.
      const dateA = a.completedAt ?? a.createdAt;
      const dateB = b.completedAt ?? b.createdAt;
      return dateA < dateB ? 1 : -1;
    }
    // Atrasadas e abertas: prazo mais próximo primeiro (nas atrasadas
    // isso equivale a mais dias de atraso primeiro); sem prazo no fim.
    const dueA = a.dueDate ?? "9999-12-31";
    const dueB = b.dueDate ?? "9999-12-31";
    return dueA < dueB ? -1 : dueA > dueB ? 1 : 0;
  });
}

/**
 * Visão pessoal do RTV: só atividades em que ele é responsável,
 * agrupadas por canal quando há mais de um. Controles que não mudariam
 * nada somem — 1 canal só não tem Combobox.
 */
export function MyActivitiesList({
  activities,
}: {
  activities: ActivityRow[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = React.useTransition();
  const [chip, setChip] = React.useState<StatusChip>("abertas");
  const [channelId, setChannelId] = React.useState<string | null>(null);

  const channels = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const activity of activities) {
      if (activity.channelId && !seen.has(activity.channelId)) {
        seen.set(activity.channelId, activity.channelName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activities]);

  // O filtro de canal some quando não mudaria o resultado.
  const showChannelFilter = channels.length > 1;

  const channelOptions: SelectOption[] = React.useMemo(
    () => [
      { value: "todos", label: "Todos os canais" },
      ...channels.map((channel) => ({
        value: channel.id,
        label: channel.name,
      })),
    ],
    [channels]
  );

  const channelApplied =
    showChannelFilter && channelId !== null && channelId !== "todos";

  const filtered = React.useMemo(() => {
    let result = activities;
    if (chip === "abertas") {
      result = result.filter((activity) => OPEN.has(activity.status));
    } else if (chip === "concluidas") {
      result = result.filter((activity) => activity.status === "concluida");
    }
    if (channelApplied) {
      result = result.filter((activity) => activity.channelId === channelId);
    }
    return result;
  }, [activities, chip, channelId, channelApplied]);

  // Agrupa por canal só quando o recorte atual mistura canais.
  const groups = React.useMemo(() => {
    const byChannel = new Map<string, { name: string; items: ActivityRow[] }>();
    for (const activity of filtered) {
      const group = byChannel.get(activity.channelId) ?? {
        name: activity.channelName,
        items: [],
      };
      group.items.push(activity);
      byChannel.set(activity.channelId, group);
    }
    return [...byChannel.entries()]
      .map(([id, group]) => ({
        id,
        name: group.name,
        items: sortActivities(group.items),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const grouped = !channelApplied && groups.length > 1;
  const flatList = React.useMemo(
    () => sortActivities(filtered),
    [filtered]
  );

  // "Limpar" leva a Todas + todos os canais — garante ver alguma coisa.
  const filtersActive = chip !== "todas" || channelApplied;

  function clearFilters() {
    setChip("todas");
    setChannelId(null);
  }

  // Nenhuma atividade atribuída ao usuário (nem concluídas).
  if (activities.length === 0) {
    return (
      <Empty className="flex-1 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListTodo />
          </EmptyMedia>
          <EmptyTitle>Nenhuma atividade atribuída a você</EmptyTitle>
          <EmptyDescription>
            Nenhuma atividade atribuída a você. Você pode registrar ações
            avulsas pelo botão abaixo.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            nativeButton={false}
            render={
              <Link href="/registrar">
                <Camera />
                Registrar
              </Link>
            }
          />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros em uma linha compacta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <div className="-my-1 flex gap-2 overflow-x-auto py-1">
          {CHIPS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setChip(item.value)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                chip === item.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {showChannelFilter ? (
          <SearchableSelect
            options={channelOptions}
            value={channelId}
            onValueChange={setChannelId}
            placeholder="Todos os canais"
            className="h-11 min-w-44 flex-1 sm:max-w-56"
          />
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-11 shrink-0 text-muted-foreground"
          aria-label="Atualizar lista"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Situação B: registro de ação que não estava no plano */}
      <Button
        variant="outline"
        size="lg"
        className="h-12 w-full border-dashed text-base"
        nativeButton={false}
        render={
          <Link href="/registrar?avulso=1">
            <ClipboardPlus className="size-5" />
            Registrar ação fora do plano
          </Link>
        }
      />

      {filtered.length === 0 ? (
        <Empty className="rounded-3xl border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Nenhum resultado com esses filtros.</EmptyTitle>
          </EmptyHeader>
          {filtersActive ? (
            <EmptyContent>
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : grouped ? (
        groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-2">
            <h2 className="flex items-baseline gap-1.5 text-sm font-semibold">
              {group.name}
              <span className="font-normal text-muted-foreground tabular-nums">
                ({group.items.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {flatList.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
