"use client";

import * as React from "react";
import { ClipboardList, Plus, SearchX } from "lucide-react";

import { ActivityCard } from "@/components/app/activity-card";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import { useWizardProvider } from "@/components/app/wizard-provider";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ActivityRow } from "@/lib/db/channels";
import { cn } from "@/lib/utils";

type StatusChip = "todas" | "abertas" | "concluidas";

const CHIPS: { value: StatusChip; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "abertas", label: "Abertas" },
  { value: "concluidas", label: "Concluídas" },
];

const OPEN = new Set(["planejada", "em_andamento", "atrasada"]);

/** Atrasadas no topo, abertas por prazo, concluídas por último. */
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
    // Abertas (e atrasadas): prazo mais próximo primeiro, sem prazo no fim.
    const dueA = a.dueDate ?? "9999-12-31";
    const dueB = b.dueDate ?? "9999-12-31";
    return dueA < dueB ? -1 : dueA > dueB ? 1 : 0;
  });
}

/**
 * Blocos C e D da visão do canal: filtros minimalistas (status, Local,
 * "Só minhas") e a lista de cards ricos. Controles que não mudariam
 * nada somem — canal com 1 filial não tem Combobox, RTV que participa
 * de tudo (ou de nada) não vê o toggle.
 */
function WizardButton() {
  const { openWizard } = useWizardProvider();
  return (
    <Button onClick={() => openWizard()}>
      <Plus className="size-4" />
      Nova atividade
    </Button>
  );
}

export function ChannelActivities({
  activities,
  branches,
  profileId,
}: {
  activities: ActivityRow[];
  branches: { id: string; name: string }[];
  profileId: string;
}) {
  const [chip, setChip] = React.useState<StatusChip>("abertas");
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [onlyMine, setOnlyMine] = React.useState(false);

  const mineCount = React.useMemo(
    () =>
      activities.filter((activity) =>
        activity.assignees.some((assignee) => assignee.id === profileId)
      ).length,
    [activities, profileId]
  );

  // Controles somem quando não mudariam o resultado.
  const showBranchFilter = branches.length > 1;
  const showOnlyMine = mineCount > 0 && mineCount < activities.length;

  const branchOptions: SelectOption[] = React.useMemo(
    () => [
      { value: "todos", label: "Todos os locais" },
      ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
    ],
    [branches]
  );

  const filtered = React.useMemo(() => {
    let result = activities;
    if (chip === "abertas") {
      result = result.filter((activity) => OPEN.has(activity.status));
    } else if (chip === "concluidas") {
      result = result.filter((activity) => activity.status === "concluida");
    }
    if (showBranchFilter && branchId && branchId !== "todos") {
      result = result.filter((activity) => activity.branchId === branchId);
    }
    if (showOnlyMine && onlyMine) {
      result = result.filter((activity) =>
        activity.assignees.some((assignee) => assignee.id === profileId)
      );
    }
    return sortActivities(result);
  }, [
    activities,
    chip,
    branchId,
    onlyMine,
    profileId,
    showBranchFilter,
    showOnlyMine,
  ]);

  const filtersActive =
    chip !== "abertas" || (branchId !== null && branchId !== "todos") || onlyMine;

  function clearFilters() {
    setChip("abertas");
    setBranchId(null);
    setOnlyMine(false);
  }

  if (activities.length === 0) {
    return (
      <Empty className="flex-1 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList />
          </EmptyMedia>
          <EmptyTitle>Nenhuma atividade neste canal</EmptyTitle>
          <EmptyDescription>
            Nenhuma atividade cadastrada neste canal ainda. Você pode
            registrar uma ação avulsa.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <WizardButton />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Bloco C — filtros em uma linha */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
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
        {showBranchFilter ? (
          <div className="flex min-w-44 flex-1 items-center gap-2 sm:max-w-64">
            <Label
              htmlFor="filtro-local"
              className="shrink-0 text-sm text-muted-foreground"
            >
              Local
            </Label>
            <SearchableSelect
              id="filtro-local"
              options={branchOptions}
              value={branchId}
              onValueChange={setBranchId}
              placeholder="Todos os locais"
              className="h-11 sm:h-9"
            />
          </div>
        ) : null}
        {showOnlyMine ? (
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <Switch
              checked={onlyMine}
              onCheckedChange={(checked) => setOnlyMine(checked)}
            />
            Só minhas
          </label>
        ) : null}
      </div>

      {/* Bloco D — cards de atividade */}
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
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
