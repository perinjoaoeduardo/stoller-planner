"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Camera,
  CircleCheckBig,
  ClipboardList,
  FileDown,
  ImageOff,
  Link2,
  ListChecks,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";

import { ActivitiesByProblemChart } from "@/components/app/activities-by-problem-chart";
import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { CategoryBadge } from "@/components/app/category-badge";
import { MonthlyRegistrationsChart } from "@/components/app/monthly-registrations-chart";
import { SearchableSelect } from "@/components/app/searchable-select";
import {
  ACTIVITY_STATUSES,
  StatusBadge,
} from "@/components/app/status-badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/config";
import type {
  ReportActivity,
  ReportPhoto,
  SeasonReport,
} from "@/lib/db/report";
import { buildExecutiveSummary } from "@/lib/reports/summary";

function photoUrl(storagePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activity-photos/${storagePath}`;
}

function formatDate(value: string | null, pattern = "dd MMM yyyy") {
  if (!value) return "—";
  return format(parseISO(value), pattern, { locale: ptBR });
}

function formatLongDate(value: string) {
  return format(parseISO(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** Miniatura da galeria com fallback para arquivo indisponível. */
function GalleryThumb({
  photo,
  onClick,
}: {
  photo: ReportPhoto;
  onClick: () => void;
}) {
  const [broken, setBroken] = React.useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-xl border bg-muted break-inside-avoid"
      style={{ breakInside: "avoid" }}
    >
      {broken ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOff className="size-5" />
          <span className="px-2 text-center text-[10px] leading-tight">
            Arquivo indisponível
          </span>
        </span>
      ) : (
        <Image
          src={photoUrl(photo.storagePath)}
          alt={photo.caption ?? photo.activityTitle}
          fill
          sizes="(max-width: 640px) 33vw, 160px"
          className="object-cover transition-transform group-hover:scale-105"
          onError={() => setBroken(true)}
        />
      )}
      {photo.caption ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-left text-[11px] text-white">
          {photo.caption}
        </span>
      ) : null}
    </button>
  );
}

/** Linha de atividade dentro de uma seção do relatório. */
function ActivityLine({ activity }: { activity: ReportActivity }) {
  return (
    <div
      className="flex flex-col gap-1 py-3"
      style={{ breakInside: "avoid" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 text-sm font-medium">{activity.title}</p>
          {activity.category ? (
            <CategoryBadge category={activity.category} />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(activity.dueDate)}
          </span>
          <StatusBadge status={activity.status} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {activity.responsibleName ?? "Sem responsável"}
        {activity.branchName ? ` · ${activity.branchName}` : ""}
      </p>
      {activity.lastExecution?.description ? (
        <p className="mt-1 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-foreground/80">
          {activity.lastExecution.description}
          <span className="mt-0.5 block text-[11px] text-muted-foreground tabular-nums">
            Registrado em {formatDate(activity.lastExecution.createdAt)}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Seção reutilizável: lista de atividades + progresso + galeria. */
function ActivitiesSection({
  title,
  description,
  activities,
  onOpenPhoto,
  index,
}: {
  title: string;
  description: string | null;
  activities: ReportActivity[];
  onOpenPhoto: (photo: ReportPhoto) => void;
  index?: number;
}) {
  const total = activities.length;
  const completed = activities.filter(
    (activity) => activity.status === "concluida"
  ).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const photos = activities.flatMap((activity) => activity.photos);

  return (
    <Card className="report-section">
      <CardHeader style={{ breakAfter: "avoid" }}>
        <CardTitle className="text-lg leading-snug">
          {typeof index === "number" ? (
            <span className="mr-2 text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
          ) : null}
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="leading-relaxed">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress value={percent} className="gap-2">
          <ProgressLabel className="text-xs text-muted-foreground">
            {completed} de {total}{" "}
            {total === 1 ? "atividade concluída" : "atividades concluídas"}
          </ProgressLabel>
          <ProgressValue className="text-xs tabular-nums" />
        </Progress>

        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade registrada para esta meta no recorte atual.
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {activities.map((activity) => (
              <ActivityLine key={activity.id} activity={activity} />
            ))}
          </div>
        )}

        {photos.length > 0 ? (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Evidências ({photos.length})
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {photos.map((photo) => (
                  <GalleryThumb
                    key={photo.id}
                    photo={photo}
                    onClick={() => onOpenPhoto(photo)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Relatório de Safra — página longa e narrativa: capa, resumo
 * executivo, seções por problema, ações fora do plano e números.
 * Tudo recalcula quando o filtro de filial muda.
 */
export function ReportView({ report }: { report: SeasonReport }) {
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    null
  );
  const [lightbox, setLightbox] = React.useState<ReportPhoto | null>(null);

  const generatedAt = React.useMemo(() => new Date().toISOString(), []);

  const hasFilters = !!branchFilter || !!categoryFilter;

  const filtered = React.useMemo(
    () =>
      report.activities.filter((activity) => {
        if (branchFilter && activity.branchId !== branchFilter) return false;
        if (categoryFilter && activity.category !== categoryFilter) {
          return false;
        }
        return true;
      }),
    [report.activities, branchFilter, categoryFilter]
  );

  const photoCount = React.useMemo(
    () => filtered.reduce((sum, activity) => sum + activity.photos.length, 0),
    [filtered]
  );

  const metrics = React.useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(
      (activity) => activity.status === "concluida"
    ).length;
    return {
      total,
      completed,
      completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [filtered]);

  /** Problemas com pelo menos 1 atividade no recorte, ou todos sem filtro. */
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

  const workedProblems = problemSections.filter(
    (section) => section.activities.length > 0
  ).length;

  const summary = React.useMemo(
    () =>
      buildExecutiveSummary({
        channelName: report.channel.name,
        harvest: report.plan?.harvest ?? null,
        problemCount: workedProblems,
        activities: filtered,
        photoCount,
      }),
    [report.channel.name, report.plan, workedProblems, filtered, photoCount]
  );

  /** Período coberto: primeira data conhecida → hoje. */
  const period = React.useMemo(() => {
    const dates = filtered
      .flatMap((activity) => [
        activity.dueDate,
        activity.completedAt?.slice(0, 10) ?? null,
        ...activity.executionDates.map((date) => date.slice(0, 10)),
      ])
      .filter((date): date is string => !!date)
      .sort();
    return dates[0] ?? null;
  }, [filtered]);

  const byStatus = React.useMemo(
    () =>
      ACTIVITY_STATUSES.map((status) => ({
        status,
        total: filtered.filter((activity) => activity.status === status)
          .length,
      })),
    [filtered]
  );

  const byProblem = React.useMemo(() => {
    const rows = problemSections.map((section) => ({
      label: section.problem.title,
      total: section.activities.length,
    }));
    if (unplanned.length > 0) {
      rows.push({ label: "Fora do plano inicial", total: unplanned.length });
    }
    return rows;
  }, [problemSections, unplanned]);

  const byCategory = React.useMemo(() => {
    const rows = ACTIVITY_CATEGORIES.map((category) => ({
      label: CATEGORY_LABELS[category],
      total: filtered.filter((activity) => activity.category === category)
        .length,
    }));
    const uncategorized = filtered.filter(
      (activity) => activity.category === null
    ).length;
    if (uncategorized > 0) {
      rows.push({ label: "Sem categoria", total: uncategorized });
    }
    return rows;
  }, [filtered]);

  const monthly = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const activity of filtered) {
      for (const date of activity.executionDates) {
        const month = date.slice(0, 7);
        map.set(month, (map.get(month) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const heroNumbers = [
    { label: "Atividades", value: metrics.total.toString(), icon: ClipboardList },
    {
      label: "Concluídas",
      value: `${metrics.completedPercent}%`,
      icon: CircleCheckBig,
    },
    {
      label: "Metas trabalhadas",
      value: workedProblems.toString(),
      icon: ListChecks,
    },
    { label: "Fotos registradas", value: photoCount.toString(), icon: Camera },
  ];

  function handleCopyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Link do relatório copiado."))
      .catch(() => toast.error("Não foi possível copiar o link."));
  }

  const branchName = branchFilter
    ? report.channel.branches.find((branch) => branch.id === branchFilter)
        ?.name
    : null;

  const categoryName = categoryFilter
    ? CATEGORY_LABELS[categoryFilter as ActivityCategory]
    : null;

  return (
    <div
      className="report-root mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* Toolbar — some na impressão */}
      <header className="flex flex-col gap-3 print:hidden">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/canais" />}>
                Canais
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link href={`/canais/${report.channel.id}`} />}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              options={report.channel.branches.map((branch) => ({
                value: branch.id,
                label: branch.name,
              }))}
              value={branchFilter}
              onValueChange={setBranchFilter}
              placeholder="Todas as filiais"
              className="w-56"
            />
            <SearchableSelect
              options={ACTIVITY_CATEGORIES.map((category) => ({
                value: category,
                label: CATEGORY_LABELS[category],
              }))}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Todas as categorias"
              className="w-56"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Link2 />
              Copiar link
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <FileDown />
              Exportar PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Capa / hero */}
      <Card className="report-hero border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardContent className="flex flex-col gap-6 pt-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
                <Sprout className="size-3.5" />
                Relatório de safra
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {report.channel.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {report.channel.region}
                {report.plan ? ` · ${report.plan.harvest}` : ""}
                {branchName ? ` · ${branchName}` : ""}
                {categoryName ? ` · ${categoryName}` : ""}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Período coberto</p>
              <p className="font-medium text-foreground tabular-nums">
                {period ? `${formatDate(period)} — hoje` : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {heroNumbers.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border bg-card/70 p-3"
              >
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <metric.icon className="size-3.5 shrink-0" />
                  {metric.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Gerado pelo Corteva Planner em {formatLongDate(generatedAt)}
          </p>
        </CardContent>
      </Card>

      {/* Resumo executivo */}
      <Card className="report-section">
        <CardHeader>
          <CardTitle>Resumo executivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed md:text-base">{summary}</p>
        </CardContent>
      </Card>

      {/* Seções por problema */}
      {problemSections.length === 0 && unplanned.length === 0 ? (
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
        <>
          {problemSections.map((section, index) => (
            <ActivitiesSection
              key={section.problem.id}
              index={index}
              title={section.problem.title}
              description={section.problem.description}
              activities={section.activities}
              onOpenPhoto={setLightbox}
            />
          ))}

          {unplanned.length > 0 ? (
            <ActivitiesSection
              title="Ações fora do plano inicial"
              description="Oportunidades e demandas que surgiram durante a safra e foram atendidas além do plano original."
              activities={unplanned}
              onOpenPhoto={setLightbox}
            />
          ) : null}

          {/* Números da safra */}
          <Card className="report-section">
            <CardHeader>
              <CardTitle>Números da safra</CardTitle>
              <CardDescription>
                A execução do plano em quatro visões: status, meta,
                categoria e ritmo de registros.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Atividades por status
                  </p>
                  <ActivitiesStatusChart data={byStatus} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Atividades por meta
                  </p>
                  <ActivitiesByProblemChart data={byProblem} />
                </div>
                <div className="lg:col-span-2">
                  <p className="mb-2 text-sm font-medium">
                    Atividades por categoria
                  </p>
                  <ActivitiesByProblemChart data={byCategory} />
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">
                  Registros de execução por mês
                </p>
                {monthly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum registro de execução no recorte atual.
                  </p>
                ) : (
                  <MonthlyRegistrationsChart data={monthly} />
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Corteva Planner · {report.channel.name}
        {report.plan ? ` · ${report.plan.harvest}` : ""} · gerado em{" "}
        {formatLongDate(generatedAt)}
      </p>

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
