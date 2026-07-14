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
import { PageShell } from "@/components/app/page-shell";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/app/searchable-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const OPEN_RANK = new Set(["planejada", "em_andamento", "atrasada"]);

/**
 * Fluxo Registrar — lógica invertida: a atividade planejada já existe;
 * o RTV ABRE a atividade, anexa foto por cima e conclui (Situação A).
 * Quem não planejou registra ação fora do plano (Situação B).
 *
 * Se o RTV tem 2+ canais e não veio com contexto, escolhe o canal
 * primeiro. Canal único: seleção automática, zero fricção extra.
 */
export function RegisterFlow({
  activities,
  branches,
  branchPlans,
  channels,
  preselectedId,
  preselectedChannelId,
  startAdhoc,
}: {
  activities: FieldActivity[];
  branches: BranchOption[];
  branchPlans: BranchPlanInfo[];
  channels: ChannelOption[];
  preselectedId: string | null;
  preselectedChannelId: string | null;
  startAdhoc: boolean;
}) {
  const router = useRouter();

  const preselectedActivity = React.useMemo(
    () => activities.find((a) => a.id === preselectedId) ?? null,
    [activities, preselectedId]
  );

  const initialChannelId = React.useMemo(() => {
    if (preselectedActivity) return preselectedActivity.channelId;
    if (
      preselectedChannelId &&
      channels.some((c) => c.id === preselectedChannelId)
    )
      return preselectedChannelId;
    if (channels.length === 1) return channels[0].id;
    return null;
  }, [preselectedActivity, preselectedChannelId, channels]);

  const [channelId, setChannelId] = React.useState<string | null>(
    initialChannelId
  );
  const [selected, setSelected] = React.useState<FieldActivity | null>(
    preselectedActivity
  );
  const [adhoc, setAdhoc] = React.useState(startAdhoc);
  const [search, setSearch] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);

  const channelActivities = React.useMemo(
    () =>
      channelId
        ? activities.filter((a) => a.channelId === channelId)
        : activities,
    [activities, channelId]
  );
  const channelBranches = React.useMemo(
    () =>
      channelId ? branches.filter((b) => b.channelId === channelId) : branches,
    [branches, channelId]
  );

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
      <PageShell
        title="Registrar execução"
        backHref="/"
      >
        <Empty className="rounded-3xl border border-dashed py-16">
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
      </PageShell>
    );
  }

  // ─── Estado 1: seleção de canal (multi-canal, canal não escolhido) ────
  if (!channelId && channels.length > 1) {
    return (
      <PageShell
        title="De qual canal é essa ação?"
        description="Selecione o canal para ver as atividades disponíveis."
        backHref="/"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {channels.map((channel) => (
            <Card
              key={channel.id}
              className="p-0 transition-colors hover:bg-muted/40"
            >
              <button
                type="button"
                onClick={() => selectChannel(channel.id)}
                className="flex w-full items-center gap-3 p-6 text-left"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-lg font-medium">{channel.name}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {channel.openActivityCount > 0
                      ? `${channel.openActivityCount} ${channel.openActivityCount === 1 ? "atividade aberta" : "atividades abertas"}`
                      : "Nenhuma atividade aberta"}
                  </p>
                </div>
                {channel.openActivityCount > 0 ? (
                  <Badge className="shrink-0 tabular-nums" variant="secondary">
                    {channel.openActivityCount}
                  </Badge>
                ) : null}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </Card>
          ))}
        </div>
      </PageShell>
    );
  }

  // ─── Situação B: ação fora do plano (delegada ao AdhocForm) ──────────
  if (adhoc) {
    return (
      <AdhocForm
        allBranches={branches}
        allBranchPlans={branchPlans}
        channels={channels}
        initialChannelId={channelId!}
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

  // ─── Estado 2: tela principal do registrar ───────────────────────────
  const openActivities = channelActivities.filter((a) =>
    OPEN_RANK.has(a.status)
  );

  // Ordenação: atrasadas > vencendo esta semana > outras abertas; dentro
  // de cada grupo, "minhas" primeiro.
  const sorted = [...openActivities].sort((a, b) => {
    const rankA = a.status === "atrasada" ? 0 : 1;
    const rankB = b.status === "atrasada" ? 0 : 1;
    if (rankA !== rankB) return rankA - rankB;
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    const dueA = a.dueDate ?? "9999-12-31";
    const dueB = b.dueDate ?? "9999-12-31";
    return dueA < dueB ? -1 : dueA > dueB ? 1 : 0;
  });

  const filtered = sorted.filter((activity) => {
    if (branchFilter && activity.branchId !== branchFilter) return false;
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return (
      activity.title.toLowerCase().includes(query) ||
      (activity.branchName ?? "").toLowerCase().includes(query)
    );
  });

  const branchOptions: SelectOption[] = channelBranches.map((branch) => ({
    value: branch.id,
    label: branch.name,
  }));

  const showBranchFilter = channelBranches.length > 1;
  const canGoBackToPicker = channels.length > 1;

  return (
    <PageShell
      title="Registrar execução"
      description="Toque na atividade planejada para concluí-la — ou registre uma ação fora do plano."
      onBack={canGoBackToPicker ? () => clearChannel() : undefined}
      backHref={canGoBackToPicker ? undefined : "/"}
      actions={
        activeChannel && channels.length > 1 ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="max-w-52 truncate">
              {activeChannel.name}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChannel}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftRight className="size-4" />
              Trocar
            </Button>
          </div>
        ) : null
      }
    >
      {/* Bloco 1 — CTA ação fora do plano */}
      <button
        type="button"
        onClick={() => setAdhoc(true)}
        className="flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border-hover bg-subtle p-5 text-left transition-colors hover:border-border-active hover:bg-muted"
      >
        <PenLine className="size-6 shrink-0 text-foreground/70" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-medium">Registrar ação fora do plano</p>
          <p className="text-sm text-muted-foreground">
            Realizou uma ação que não estava no plano? Registre aqui.
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>

      {/* Bloco 2 — Separador */}
      <div className="relative my-2 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="shrink-0 text-xs text-muted-foreground">
          ou selecione uma atividade planejada
        </span>
        <Separator className="flex-1" />
      </div>

      {/* Bloco 3 — Busca + filtro de filial */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar atividade..."
            className="h-10 pl-9"
            aria-label="Buscar atividade"
          />
        </div>
        {showBranchFilter ? (
          <SearchableSelect
            options={branchOptions}
            value={branchFilter}
            onValueChange={setBranchFilter}
            placeholder="Todos os locais"
            className="h-10 min-w-52"
          />
        ) : null}
      </div>

      {/* Bloco 4 — Lista de atividades planejadas */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <Empty className="rounded-3xl border border-dashed py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>
                {search.trim().length > 0
                  ? "Nenhum resultado para essa busca."
                  : "Nenhuma atividade planejada aberta neste canal."}
              </EmptyTitle>
              <EmptyDescription>
                {search.trim().length > 0
                  ? "Ajuste a busca ou registre uma ação fora do plano no topo."
                  : "Você ainda pode registrar uma ação fora do plano acima."}
              </EmptyDescription>
            </EmptyHeader>
            {search.trim().length > 0 ? (
              <div className="pt-2">
                <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                  Limpar busca
                </Button>
              </div>
            ) : null}
          </Empty>
        ) : (
          filtered.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setSelected(activity)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="line-clamp-2 leading-snug font-medium">
                    {activity.title}
                  </p>
                  {activity.isMine ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 bg-primary/10 text-primary",
                        "hover:bg-primary/10"
                      )}
                    >
                      minha
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {activity.branchName ?? "Canal geral"}
                  {activity.category ? " · " : ""}
                  {activity.category ? (
                    <CategoryBadge
                      category={activity.category}
                      className="ml-1"
                    />
                  ) : null}
                </p>
                <div className="flex items-center gap-3">
                  <StatusBadge status={activity.status} />
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      activity.status === "atrasada"
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatRelativeDue(activity.dueDate)}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </PageShell>
  );
}

