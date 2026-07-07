"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Building2,
  ChevronRight,
  PenLine,
  Search,
  SearchX,
} from "lucide-react";

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
  ChannelOption,
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
 *
 * Se o RTV tem mais de 1 canal, ele escolhe o canal primeiro.
 * Canal único: seleção automática, zero fricção extra.
 */
export function RegisterFlow({
  activities,
  branches,
  branchPlans,
  channels,
  preselectedId,
  startAdhoc,
}: {
  activities: FieldActivity[];
  branches: BranchOption[];
  branchPlans: BranchPlanInfo[];
  channels: ChannelOption[];
  preselectedId: string | null;
  startAdhoc: boolean;
}) {
  const router = useRouter();

  // Canal inicial: inferido da atividade pre-selecionada, auto-selecionado
  // se único, ou null (picker visível) se multi-canal.
  const preselectedActivity = React.useMemo(
    () => activities.find((a) => a.id === preselectedId) ?? null,
    [activities, preselectedId]
  );

  const initialChannelId = React.useMemo(() => {
    if (preselectedActivity) return preselectedActivity.channelId;
    if (channels.length === 1) return channels[0].id;
    return null;
  }, [preselectedActivity, channels]);

  const [channelId, setChannelId] = React.useState<string | null>(
    initialChannelId
  );
  const [selected, setSelected] = React.useState<FieldActivity | null>(
    preselectedActivity
  );
  const [adhoc, setAdhoc] = React.useState(startAdhoc);
  const [search, setSearch] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);

  // Dados filtrados pelo canal selecionado
  const channelActivities = React.useMemo(
    () =>
      channelId ? activities.filter((a) => a.channelId === channelId) : activities,
    [activities, channelId]
  );
  const channelBranches = React.useMemo(
    () =>
      channelId ? branches.filter((b) => b.channelId === channelId) : branches,
    [branches, channelId]
  );
  const channelBranchPlans = React.useMemo(() => {
    const ids = new Set(channelBranches.map((b) => b.id));
    return branchPlans.filter((bp) => ids.has(bp.branchId));
  }, [branchPlans, channelBranches]);

  const activeChannel = channelId
    ? (channels.find((c) => c.id === channelId) ?? null)
    : null;

  function selectChannel(id: string) {
    setChannelId(id);
    setBranchFilter(null);
    setSearch("");
  }

  function clearChannel() {
    setChannelId(null);
    setBranchFilter(null);
    setSearch("");
  }

  // ─── 0 canais: erro de vínculo ────────────────────────────────────────
  if (channels.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Nenhum canal vinculado</EmptyTitle>
            <EmptyDescription>
              Você não está vinculado a nenhum canal. Fale com o time de CX.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // ─── Picker de canal (multi-canal, canal não escolhido) ───────────────
  if (!channelId && channels.length > 1) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <header className="px-4 py-3">
          <h1 className="text-lg leading-tight font-semibold tracking-tight">
            De qual canal é essa ação?
          </h1>
          <p className="text-xs text-muted-foreground">
            Selecione o canal para ver as atividades disponíveis.
          </p>
        </header>
        <div className="flex flex-1 flex-col gap-2 px-4 pb-4">
          {channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => selectChannel(channel.id)}
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{channel.name}</p>
                <p className="text-sm text-muted-foreground">
                  {channel.openActivityCount > 0
                    ? `${channel.openActivityCount} atividade${channel.openActivityCount !== 1 ? "s" : ""} aberta${channel.openActivityCount !== 1 ? "s" : ""}`
                    : "Nenhuma atividade aberta"}
                </p>
              </div>
              {channel.openActivityCount > 0 ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
                  {channel.openActivityCount}
                </span>
              ) : null}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Situação B: ação fora do plano ──────────────────────────────────
  if (adhoc) {
    return (
      <AdhocForm
        branches={channelBranches}
        branchPlans={channelBranchPlans}
        channelId={channelId!}
        channelName={activeChannel?.name ?? ""}
        onBack={() => setAdhoc(false)}
        onChangeChannel={
          channels.length > 1
            ? () => {
                setAdhoc(false);
                clearChannel();
              }
            : undefined
        }
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
  const filtered = channelActivities.filter((activity) => {
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
        {channels.length > 1 && activeChannel ? (
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {activeChannel.name}
            </span>
            <button
              type="button"
              onClick={clearChannel}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftRight className="size-3" />
              Trocar
            </button>
          </div>
        ) : null}
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

        {channelBranches.length > 1 ? (
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
            {channelBranches.map((branch) => (
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
                    {activity.branchName ?? "Canal geral"} ·{" "}
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
