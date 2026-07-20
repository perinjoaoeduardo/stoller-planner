"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarRange,
  ClipboardList,
  FileDown,
  Link2,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import { SearchableSelect } from "@/components/app/searchable-select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/config";
import { ACTIVITY_STATUSES } from "@/components/shared/status-badge";
import type { Role } from "@/lib/auth/nav";
import type { ReportPhoto, SeasonReport } from "@/lib/db/report";
import { buildExecutiveSummary } from "@/lib/reports/summary";
import { cn } from "@/lib/utils";

import { PresentMode, type Slide } from "./present-mode";
import {
  ChannelAvatar,
  MetaBlock,
  MetasSemPlanoBlock,
  NumerosBlock,
  PanoramaBlock,
  ReportFooter,
  RitmoBlock,
  formatLongDate,
  photoUrl,
  type PanoramaStats,
  type ReportMode,
} from "./report-blocks";

const MODE_STORAGE_KEY = "corteva:report-mode";

const PERIOD_PRESETS = [
  { value: "safra", label: "Safra completa" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "60", label: "Últimos 60 dias" },
  { value: "90", label: "Últimos 90 dias" },
] as const;

type PeriodValue = (typeof PERIOD_PRESETS)[number]["value"] | "custom";

/**
 * Relatório de Safra — página longa e narrativa montada como BLOCOS
 * autônomos. Os mesmos blocos alimentam a tela empilhada e o modo
 * Apresentar (um por slide), então não existe versão "de apresentação"
 * paralela para sair de sincronia.
 *
 * O toggle Interno/Externo é a decisão central: interno fala de
 * execução (%, atrasos, pendências), externo é o que vai para o canal e
 * conta só o trabalho entregue.
 */
export function ReportView({
  report,
  role = "DSM",
  canEdit = false,
}: {
  report: SeasonReport;
  role?: Role;
  /** Resolvido no servidor (canEditPlan): libera o CTA de resultado. */
  canEdit?: boolean;
}) {
  const isField = role === "RTV";

  const [mode, setMode] = React.useState<ReportMode>("interno");
  const [period, setPeriod] = React.useState<PeriodValue>("safra");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    null
  );
  const [lightbox, setLightbox] = React.useState<ReportPhoto | null>(null);
  const [presenting, setPresenting] = React.useState(false);

  const generatedAt = React.useMemo(() => new Date().toISOString(), []);
  const currentMonth = React.useMemo(
    () => new Date().toISOString().slice(0, 7),
    []
  );

  // Preferência de modo por usuário. Lida no efeito (não na inicialização
  // do state) para o HTML do servidor bater com o do cliente.
  React.useEffect(() => {
    const saved = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === "interno" || saved === "externo") setMode(saved);
  }, []);

  function changeMode(next: ReportMode) {
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  }

  /** Recorte de datas ativo (null = safra completa). */
  const range = React.useMemo(() => {
    if (period === "safra") return null;
    if (period === "custom") {
      if (!customFrom && !customTo) return null;
      return { from: customFrom || null, to: customTo || null };
    }
    return {
      from: format(subDays(new Date(), Number(period)), "yyyy-MM-dd"),
      to: null,
    };
  }, [period, customFrom, customTo]);

  const hasFilters = !!branchFilter || !!categoryFilter || !!range;

  const filtered = React.useMemo(
    () =>
      report.activities.filter((activity) => {
        if (branchFilter && activity.branchId !== branchFilter) return false;
        if (categoryFilter && activity.category !== categoryFilter) {
          return false;
        }
        if (range) {
          // Uma atividade entra no recorte se QUALQUER data sua cai nele.
          // Sem data nenhuma, entra sempre (senão sumiria do relatório).
          const dates = [
            activity.dueDate,
            ...activity.executionDates.map((date) => date.slice(0, 10)),
          ].filter((date): date is string => !!date);
          if (dates.length > 0) {
            const inside = dates.some(
              (date) =>
                (!range.from || date >= range.from) &&
                (!range.to || date <= range.to)
            );
            if (!inside) return false;
          }
        }
        return true;
      }),
    [report.activities, branchFilter, categoryFilter, range]
  );

  const photoCount = React.useMemo(
    () => filtered.reduce((sum, activity) => sum + activity.photos.length, 0),
    [filtered]
  );

  /** Metas com pelo menos 1 atividade no recorte (ou todas sem filtro). */
  const problemSections = React.useMemo(
    () =>
      report.problems
        .map((problem) => ({
          problem,
          activities: filtered.filter(
            (activity) => activity.problemId === problem.id
          ),
        }))
        .filter((section) => !hasFilters || section.activities.length > 0),
    [report.problems, filtered, hasFilters]
  );

  const unplanned = React.useMemo(
    () => filtered.filter((activity) => activity.problemId === null),
    [filtered]
  );

  const workedSections = problemSections.filter(
    (section) => section.activities.length > 0
  );

  /** FIX 3 — metas mapeadas que não geraram nenhuma ação. */
  const metasSemPlano = React.useMemo(
    () =>
      report.problems
        .filter(
          (problem) =>
            !report.activities.some(
              (activity) => activity.problemId === problem.id
            )
        )
        .map((problem) => ({ id: problem.id, title: problem.title })),
    [report.problems, report.activities]
  );

  const stats: PanoramaStats = React.useMemo(() => {
    const planned = filtered.length;
    const done = filtered.filter(
      (activity) => activity.status === "concluida"
    ).length;
    const late = filtered.filter(
      (activity) => activity.status === "atrasada"
    ).length;
    const onTime = filtered.filter((activity) => {
      if (activity.status !== "concluida") return false;
      if (!activity.dueDate || !activity.completedAt) return true;
      return activity.completedAt.slice(0, 10) <= activity.dueDate;
    }).length;

    const months = new Set(
      filtered.flatMap((activity) =>
        activity.executionDates.map((date) => date.slice(0, 7))
      )
    );
    const sortedMonths = [...months].sort();
    const periodLabel =
      sortedMonths.length > 0
        ? `de ${monthShort(sortedMonths[0])} a ${monthShort(
            sortedMonths[sortedMonths.length - 1]
          )}`
        : "sem registros";

    return {
      done,
      planned,
      completedPercent: planned > 0 ? Math.round((done / planned) * 100) : 0,
      onTime,
      workedProblems: workedSections.length,
      totalProblems: report.problems.length,
      photoCount,
      activeMonths: months.size,
      periodLabel,
      // "No ritmo" = nada atrasado e nenhuma meta órfã.
      healthy: late === 0 && metasSemPlano.length === 0,
    };
  }, [
    filtered,
    workedSections.length,
    report.problems.length,
    photoCount,
    metasSemPlano.length,
  ]);

  const summary = React.useMemo(
    () =>
      buildExecutiveSummary({
        channelName: report.channel.name,
        harvest: report.plan?.harvest ?? null,
        problemCount: workedSections.length,
        activities: filtered,
        photoCount,
        mode,
      }),
    [
      report.channel.name,
      report.plan,
      workedSections.length,
      filtered,
      photoCount,
      mode,
    ]
  );

  const byStatus = React.useMemo(
    () =>
      ACTIVITY_STATUSES.map((status) => ({
        status,
        total: filtered.filter((activity) => activity.status === status).length,
      })),
    [filtered]
  );

  const byProblem = React.useMemo(() => {
    const rows = workedSections.map((section) => ({
      label: section.problem.title,
      total: section.activities.length,
    }));
    if (unplanned.length > 0) {
      rows.push({ label: "Fora do plano inicial", total: unplanned.length });
    }
    return rows;
  }, [workedSections, unplanned]);

  const byCategory = React.useMemo(() => {
    const rows = ACTIVITY_CATEGORIES.map((category) => ({
      label: CATEGORY_LABELS[category],
      total: filtered.filter((activity) => activity.category === category)
        .length,
    })).filter((row) => row.total > 0);
    const uncategorized = filtered.filter(
      (activity) => activity.category === null
    ).length;
    if (uncategorized > 0) {
      rows.push({ label: "Sem categoria", total: uncategorized });
    }
    return rows;
  }, [filtered]);

  /** FIX 5 — série mensal de execuções para o heatmap. */
  const monthly = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const activity of filtered) {
      for (const date of activity.executionDates) {
        const month = date.slice(0, 7);
        map.set(month, (map.get(month) ?? 0) + 1);
      }
    }
    if (map.size === 0) return [];
    // Preenche os buracos: um mês sem ação é informação, não ausência.
    const sorted = [...map.keys()].sort();
    const out: { month: string; total: number }[] = [];
    const cursor = parseISO(`${sorted[0]}-01`);
    const last = parseISO(`${sorted[sorted.length - 1]}-01`);
    while (cursor <= last) {
      const key = format(cursor, "yyyy-MM");
      out.push({ month: key, total: map.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [filtered]);

  const adjustments = React.useMemo(
    () =>
      filtered.filter(
        (activity) =>
          activity.status === "atrasada" || activity.status === "nao_feita"
      ).length,
    [filtered]
  );

  function handleCopyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Link do relatório copiado."))
      .catch(() => toast.error("Não foi possível copiar o link."));
  }

  const branchName = branchFilter
    ? report.channel.branches.find((branch) => branch.id === branchFilter)?.name
    : null;
  const categoryName = categoryFilter
    ? CATEGORY_LABELS[categoryFilter as ActivityCategory]
    : null;

  const periodLabel =
    period === "custom"
      ? customFrom || customTo
        ? `${customFrom || "início"} → ${customTo || "hoje"}`
        : "personalizado"
      : PERIOD_PRESETS.find((preset) => preset.value === period)?.label ??
        "Safra completa";

  const isEmpty = workedSections.length === 0 && unplanned.length === 0;

  // ── Blocos → slides. A tela empilha; o Apresentar mostra um por vez.
  const slides: Slide[] = React.useMemo(() => {
    const list: Slide[] = [];

    list.push({
      id: "panorama",
      title: "Panorama",
      node: <PanoramaBlock mode={mode} stats={stats} />,
    });

    list.push({
      id: "resumo",
      title: "Resumo executivo",
      node: (
        <Card className="report-section">
          <CardContent className="pt-6">
            <p className="text-base leading-relaxed">{summary}</p>
          </CardContent>
        </Card>
      ),
    });

    if (mode === "interno" && metasSemPlano.length > 0) {
      list.push({
        id: "sem-plano",
        title: "Metas sem plano",
        node: (
          <MetasSemPlanoBlock
            problems={metasSemPlano}
            channelHref={`${isField ? "/meus-canais" : "/canais"}/${report.channel.id}`}
          />
        ),
      });
    }

    workedSections.forEach((section, index) => {
      list.push({
        id: section.problem.id,
        title: section.problem.title,
        node: (
          <MetaBlock
            index={index}
            title={section.problem.title}
            description={section.problem.description}
            activities={section.activities}
            mode={mode}
            onOpenPhoto={setLightbox}
            isMeta
            problemId={section.problem.id}
            resultado={section.problem.resultado}
            canEdit={canEdit}
          />
        ),
      });
    });

    if (unplanned.length > 0) {
      list.push({
        id: "fora-do-plano",
        title: "Ações fora do plano inicial",
        node: (
          <MetaBlock
            title="Ações fora do plano inicial"
            description="Oportunidades e demandas que surgiram durante a safra e foram atendidas além do plano original."
            activities={unplanned}
            mode={mode}
            onOpenPhoto={setLightbox}
          />
        ),
      });
    }

    if (monthly.length > 0) {
      list.push({
        id: "ritmo",
        title: "Ritmo da safra",
        node: <RitmoBlock data={monthly} currentMonth={currentMonth} />,
      });
    }

    if (mode === "interno") {
      list.push({
        id: "numeros",
        title: "Números da safra",
        node: (
          <NumerosBlock
            byStatus={byStatus}
            byProblem={byProblem}
            byCategory={byCategory}
          />
        ),
      });
    }

    return list;
  }, [
    mode,
    stats,
    summary,
    metasSemPlano,
    workedSections,
    unplanned,
    monthly,
    currentMonth,
    byStatus,
    byProblem,
    byCategory,
    isField,
    report.channel.id,
    canEdit,
  ]);

  if (presenting) {
    return (
      <PresentMode
        slides={[
          {
            id: "capa",
            title: report.channel.name,
            node: (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <ChannelAvatar name={report.channel.name} />
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Relatório de safra
                </p>
                <h1 className="text-4xl font-semibold tracking-tight">
                  {report.channel.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {report.channel.region}
                  {report.plan ? ` · ${report.plan.harvest}` : ""}
                </p>
              </div>
            ),
          },
          ...slides,
          {
            id: "encerramento",
            title: "Encerramento",
            node: (
              <div className="py-16 text-center">
                <p className="text-2xl font-semibold tracking-tight">
                  Obrigado.
                </p>
                <ReportFooter
                  channelName={report.channel.name}
                  harvest={report.plan?.harvest ?? null}
                  generatedAt={generatedAt}
                  mode={mode}
                  adjustments={adjustments}
                />
              </div>
            ),
          },
        ]}
        onClose={() => setPresenting(false)}
      />
    );
  }

  return (
    <div
      className="report-root mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <div className="print:hidden">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link href={isField ? "/meus-canais" : "/canais"} />}
              >
                {isField ? "Meus Canais" : "Canais"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link
                    href={`${isField ? "/meus-canais" : "/canais"}/${report.channel.id}`}
                  />
                }
              >
                {report.channel.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Relatório de safra</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* FIX 1 — Header */}
      <Card className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <ChannelAvatar name={report.channel.name} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Relatório de safra
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {report.channel.name}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {report.channel.region}
              {report.plan ? ` · ${report.plan.harvest}` : ""}
              {branchName ? ` · ${branchName}` : ""}
              {categoryName ? ` · ${categoryName}` : ""}
            </p>
          </div>
          <span className="ml-auto text-sm font-semibold text-foreground/70">
            Corteva Planner
          </span>
        </div>

        {/* Controles */}
        <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="h-9">
                  <CalendarRange className="size-4" />
                  Período: {periodLabel}
                </Button>
              }
            />
            <PopoverContent align="start" className="w-64 p-2">
              <div className="flex flex-col">
                {PERIOD_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setPeriod(preset.value)}
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-hover-surface",
                      period === preset.value
                        ? "bg-subtle font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
                <div className="mt-2 border-t border-border pt-2">
                  <p className="px-2 pb-1.5 text-xs text-muted-foreground">
                    Período personalizado
                  </p>
                  <div className="flex flex-col gap-2 px-2 pb-1">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="periodo-de" className="text-xs">
                        De
                      </Label>
                      <Input
                        id="periodo-de"
                        type="date"
                        value={customFrom}
                        onChange={(event) => {
                          setCustomFrom(event.target.value);
                          setPeriod("custom");
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="periodo-ate" className="text-xs">
                        Até
                      </Label>
                      <Input
                        id="periodo-ate"
                        type="date"
                        value={customTo}
                        onChange={(event) => {
                          setCustomTo(event.target.value);
                          setPeriod("custom");
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <SearchableSelect
            options={report.channel.branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            }))}
            value={branchFilter}
            onValueChange={setBranchFilter}
            placeholder="Todas as filiais"
            className="w-44"
          />
          <SearchableSelect
            options={ACTIVITY_CATEGORIES.map((category) => ({
              value: category,
              label: CATEGORY_LABELS[category],
            }))}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            placeholder="Todos os tipos"
            className="w-44"
          />

          <span aria-hidden className="mx-1 h-6 w-px bg-border" />

          {/* FIX 9 — Interno / Externo */}
          <div className="flex rounded-lg bg-muted p-1">
            {(["interno", "externo"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeMode(option)}
                aria-pressed={mode === option}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  mode === option
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              <Link2 className="size-4" />
              <span className="hidden sm:inline">Copiar link</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresenting(true)}
            >
              <Play className="size-4" />
              Apresentar
            </Button>
            {!isField && (
              <Button size="sm" onClick={() => window.print()}>
                <FileDown className="size-4" />
                Exportar PDF
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Blocos */}
      {isEmpty ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList />
                </EmptyMedia>
                <EmptyTitle>Nada para relatar neste recorte</EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Nenhuma atividade da safra corresponde a este recorte. Limpe os filtros para ver o relatório completo."
                    : "O plano ainda não tem metas nem atividades registradas."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        slides.map((slide) => (
          <React.Fragment key={slide.id}>{slide.node}</React.Fragment>
        ))
      )}

      <ReportFooter
        channelName={report.channel.name}
        harvest={report.plan?.harvest ?? null}
        generatedAt={generatedAt}
        mode={mode}
        adjustments={adjustments}
      />

      {/* Lightbox */}
      <Dialog
        open={!!lightbox}
        onOpenChange={(open) => !open && setLightbox(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-6 text-base leading-snug">
              {lightbox?.activityTitle}
            </DialogTitle>
            <DialogDescription>
              {lightbox?.caption ??
                (lightbox
                  ? `Evidência registrada em ${formatLongDate(lightbox.createdAt)}`
                  : "")}
            </DialogDescription>
          </DialogHeader>
          {lightbox ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photoUrl(lightbox.storagePath)}
              alt={lightbox.caption ?? lightbox.activityTitle}
              className="max-h-[70dvh] w-full rounded-2xl object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function monthShort(month: string) {
  return format(parseISO(`${month}-01`), "MMM yy", { locale: ptBR }).replace(
    ".",
    ""
  );
}
