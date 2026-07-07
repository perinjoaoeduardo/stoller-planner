"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, PenLine, Search, SearchX } from "lucide-react";

import { CategoryBadge } from "@/components/app/category-badge";
import { StatusBadge } from "@/components/app/status-badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type {
  BranchOption,
  BranchPlanInfo,
  FieldActivity,
} from "@/lib/db/execution";
import { formatRelativeDue } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";

import { AdhocForm } from "./adhoc-form";
import { CompleteActivity } from "./complete-activity";

/**
 * Fluxo Registrar — lógica invertida: a atividade planejada já existe,
 * o usuário ABRE a atividade, anexa a foto por cima e conclui
 * (Situação A). Quem não planejou registra a ação fora do plano
 * (Situação B). Quanto mais planejado, menos trabalho no campo.
 */
export function RegisterFlow({
  activities,
  branches,
  branchPlans,
  preselectedId,
  startAdhoc,
}: {
  activities: FieldActivity[];
  branches: BranchOption[];
  branchPlans: BranchPlanInfo[];
  preselectedId: string | null;
  startAdhoc: boolean;
}) {
  const router = useRouter();

  const [selected, setSelected] = React.useState<FieldActivity | null>(
    () => activities.find((activity) => activity.id === preselectedId) ?? null
  );
  const [adhoc, setAdhoc] = React.useState(startAdhoc);
  const [search, setSearch] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);

  // ─── Situação B: ação fora do plano ──────────────────────────────────
  if (adhoc) {
    return (
      <AdhocForm
        branches={branches}
        branchPlans={branchPlans}
        onBack={() => setAdhoc(false)}
      />
    );
  }

  // ─── Situação A: abrir a atividade planejada e concluir ──────────────
  if (selected) {
    return (
      <CompleteActivity
        activity={selected}
        onBack={() => setSelected(null)}
        onDone={() => {
          setSelected(null);
          router.refresh();
        }}
      />
    );
  }

  // ─── Picker: qual atividade você executou? ───────────────────────────
  const filtered = activities.filter((activity) => {
    if (branchFilter && activity.branchId !== branchFilter) return false;
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return (
      activity.title.toLowerCase().includes(query) ||
      (activity.branchName ?? "").toLowerCase().includes(query) ||
      activity.channelName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <header className="px-4 py-3">
        <h1 className="text-lg leading-tight font-semibold tracking-tight">
          Registrar execução
        </h1>
        <p className="text-xs text-muted-foreground">
          Toque na atividade planejada para concluí-la — ou registre uma
          ação fora do plano.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        {/* Card — ação fora do plano (Situação B) */}
        <button
          type="button"
          onClick={() => setAdhoc(true)}
          className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#0063A7]/15 bg-[#0063A7]/5 p-3 text-left transition-colors hover:bg-[#0063A7]/10 active:bg-[#0063A7]/15 dark:border-[#0063A7]/20 dark:bg-[#0063A7]/10 dark:hover:bg-[#0063A7]/15"
        >
          <PenLine className="size-5 shrink-0 text-[#0063A7]" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-medium">Registrar ação fora do plano</p>
            <p className="text-sm text-muted-foreground">
              Realizou uma ação que não estava no plano? Registre aqui.
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-[#0063A7]" />
        </button>

        {/* Divisor */}
        <div className="relative my-3 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="shrink-0 text-xs text-muted-foreground">
            ou selecione uma atividade planejada
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar atividade..."
            className="h-11 pl-9"
            aria-label="Buscar atividade"
          />
        </div>

        {branches.length > 1 ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <button
              type="button"
              onClick={() => setBranchFilter(null)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                branchFilter === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              Todas
            </button>
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() =>
                  setBranchFilter((current) =>
                    current === branch.id ? null : branch.id
                  )
                }
                className={cn(
                  "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                  branchFilter === branch.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {branch.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>Nenhuma atividade aberta</EmptyTitle>
                <EmptyDescription>
                  Nada encontrado no recorte atual — você pode registrar
                  uma ação fora do plano no topo da tela.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            filtered.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelected(activity)}
                className="flex min-h-16 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 leading-snug font-medium">
                    {activity.title}
                    {activity.isMine ? (
                      <span className="ml-1.5 align-middle text-[10px] font-semibold text-primary uppercase">
                        minha
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {activity.branchName ?? "Sem filial"} ·{" "}
                    {formatRelativeDue(activity.dueDate)}
                  </p>
                  {activity.category ? (
                    <CategoryBadge category={activity.category} />
                  ) : null}
                </div>
                <StatusBadge status={activity.status} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}

        </div>
      </div>
    </div>
  );
}
