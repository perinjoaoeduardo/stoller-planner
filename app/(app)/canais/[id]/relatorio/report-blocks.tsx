"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Camera,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  ImageOff,
  ListChecks,
  Pencil,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { ActivitiesByProblemChart } from "@/components/app/activities-by-problem-chart";
import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { useActivityDrawer } from "@/components/app/activity-drawer";
import { CategoryIconBox } from "@/components/shared/icon-box";
import { DeadlineText } from "@/components/shared/deadline-text";
import { SeasonHeatmap, type HeatmapMonth } from "@/components/shared/season-heatmap";
import { StatCard } from "@/components/shared/stat-card";
import { TruncatedText } from "@/components/shared/truncated-text";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { setProblemResultado } from "@/lib/actions/plan";
import { categoryIcon } from "@/lib/category-icons";
import type { ReportActivity, ReportPhoto } from "@/lib/db/report";
import { cn } from "@/lib/utils";

/**
 * Blocos autônomos do Relatório de Safra. Cada export daqui é um bloco
 * que a tela empilha e o modo Apresentar mostra um por slide — por isso
 * nenhum deles conhece o layout externo.
 *
 * A regra que atravessa o arquivo: o MODO decide o que aparece.
 * "interno" fala de execução (%, atrasos, pendências); "externo" é o
 * relatório que vai para o canal e conta só o trabalho entregue.
 */

export type ReportMode = "interno" | "externo";

export function photoUrl(storagePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activity-photos/${storagePath}`;
}

export function formatDate(value: string | null, pattern = "dd MMM yyyy") {
  if (!value) return "—";
  return format(parseISO(value), pattern, { locale: ptBR });
}

export function formatLongDate(value: string) {
  return format(parseISO(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${
    parts.length > 1 ? parts[parts.length - 1][0] : ""
  }`.toUpperCase();
}

/**
 * Peças que SÓ existem no PDF (hidden na tela, display forçado no
 * @media print): capa do documento e o cabeçalho/rodapé que se repetem
 * em toda página. É o que separa "documento" de "screenshot da tela".
 */
export function ReportPrintDocument({
  channelName,
  region,
  harvest,
  mode,
  periodLabel,
  generatedAt,
}: {
  channelName: string;
  region: string;
  harvest: string | null;
  mode: ReportMode;
  periodLabel: string;
  generatedAt: string;
}) {
  const harvestLabel = harvest ?? "Safra atual";
  return (
    <>
      {/* Cabeçalho corrido — repete no topo de cada página */}
      <div className="report-print-running-header hidden">
        <span>{channelName}</span>
        <span>Relatório de safra · {harvestLabel}</span>
      </div>

      {/* Capa */}
      <div className="report-print-cover hidden min-h-[220mm] flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Corteva Planner
          </p>
          <div className="mt-[60mm]">
            <p className="text-sm uppercase tracking-wider text-muted-foreground">
              Relatório de safra
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              {channelName}
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              {region} · {harvestLabel}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 border-t border-border pt-5 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Período coberto
            </dt>
            <dd className="mt-0.5 font-medium">{periodLabel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Versão do documento
            </dt>
            <dd className="mt-0.5 font-medium">
              {mode === "externo"
                ? "Externa — para o canal"
                : "Interna — gestão"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Emitido em
            </dt>
            <dd className="mt-0.5 font-medium">
              {formatLongDate(generatedAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Rodapé corrido — repete no fim de cada página */}
      <div className="report-print-running-footer hidden">
        <span>
          Corteva Planner · {channelName}
          {harvest ? ` · ${harvest}` : ""}
        </span>
        <span>
          Página <span className="report-print-pageno" />
        </span>
      </div>
    </>
  );
}

/** Avatar do canal com iniciais — mesmo padrão de Meus Canais. */
export function ChannelAvatar({ name }: { name: string }) {
  return (
    <Avatar className="size-14 shrink-0 rounded-lg">
      <AvatarFallback className="rounded-lg bg-muted text-lg font-semibold text-foreground/70">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Miniatura da galeria com fallback para arquivo indisponível. */
export function GalleryThumb({
  photo,
  onClick,
  originLabel,
  originCategory,
}: {
  photo: ReportPhoto;
  onClick: () => void;
  /** Badge de origem — só quando as fotos vêm de várias atividades. */
  originLabel?: string;
  originCategory?: ReportActivity["category"];
}) {
  const [broken, setBroken] = React.useState(false);
  const OriginIcon = originCategory ? categoryIcon(originCategory) : null;

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
      {OriginIcon && originLabel ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md bg-background/85 ring-1 ring-border" />
            }
          >
            <OriginIcon className="size-3 text-foreground/70" />
          </TooltipTrigger>
          <TooltipContent>{originLabel}</TooltipContent>
        </Tooltip>
      ) : null}
      {photo.caption ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-foreground/55 px-2 py-1 text-left text-[11px] text-background">
          {photo.caption}
        </span>
      ) : null}
    </button>
  );
}

/** Linha escaneável de atividade dentro do bloco de meta. */
function ActivityLine({
  activity,
  showResponsible,
  mode,
  onOpen,
}: {
  activity: ReportActivity;
  showResponsible: boolean;
  mode: ReportMode;
  onOpen: (id: string) => void;
}) {
  const executedAt = activity.lastExecution?.createdAt ?? null;
  // No externo o status "ruim" some: o canal vê o que foi feito, não a
  // contabilidade interna de atraso.
  const showStatus = mode === "interno" || activity.status === "concluida";

  return (
    <button
      type="button"
      onClick={() => onOpen(activity.id)}
      style={{ breakInside: "avoid" }}
      // -mx-2 compensa o px-2 do hover para a barra do hover ficar
      // "flutuando" dentro do card com respiro nas bordas — sem isso a
      // linha do hover encostava nas paredes do card e parecia crua.
      className="group -mx-2 flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-3 text-left transition-colors duration-base ease-standard hover:bg-hover-surface"
    >
      <CategoryIconBox
        category={activity.category}
        size="md"
        withTooltip
        className="self-center"
      />
      <div className="min-w-0 flex-1">
        <TruncatedText
          text={activity.title}
          className="text-sm font-medium text-foreground"
        />
        {showResponsible ? (
          <p className="truncate text-xs text-muted-foreground">
            {activity.responsibleName ?? "Sem responsável"}
            {activity.branchName ? ` · ${activity.branchName}` : ""}
          </p>
        ) : null}
      </div>
      {executedAt ? (
        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
          {formatDate(executedAt)}
        </span>
      ) : mode === "interno" ? (
        <DeadlineText
          dueDate={activity.dueDate}
          status={activity.status}
          format="date"
          className="shrink-0 whitespace-nowrap text-xs"
        />
      ) : null}
      {showStatus ? <StatusBadge status={activity.status} /> : null}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground print:hidden" />
    </button>
  );
}

// ── FIX 2 — Panorama ──────────────────────────────────────────────────

export type PanoramaStats = {
  done: number;
  planned: number;
  completedPercent: number;
  onTime: number;
  workedProblems: number;
  totalProblems: number;
  photoCount: number;
  activeMonths: number;
  /** Meses com pelo menos uma execução, formatados curto ("mai", "jun"). */
  activeMonthLabels: string[];
  healthy: boolean;
};

export function PanoramaBlock({
  mode,
  stats,
}: {
  mode: ReportMode;
  stats: PanoramaStats;
}) {
  if (mode === "externo") {
    // Card Evidências some quando não há foto — mostrar "0 fotos" para o
    // canal soa como cobrança contra o time. Menos > mal-vendido.
    const showEvidencias = stats.photoCount > 0;
    // "Ações realizadas em" mostra os meses; só cai para o resumo
    // "N meses ativos" quando a lista fica longa demais.
    const monthsValue =
      stats.activeMonthLabels.length === 0
        ? "—"
        : stats.activeMonthLabels.length <= 4
          ? stats.activeMonthLabels.join(" · ")
          : `${stats.activeMonths} meses ativos`;
    const monthsSublabel =
      stats.activeMonthLabels.length === 0
        ? "sem execuções registradas"
        : stats.activeMonthLabels.length <= 4
          ? "de 12 meses da safra"
          : `${stats.activeMonthLabels[0]} a ${stats.activeMonthLabels[stats.activeMonthLabels.length - 1]}`;

    return (
      <div
        className={cn(
          "grid gap-4",
          showEvidencias
            ? "grid-cols-2 md:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-3"
        )}
      >
        <StatCard
          title="Ações realizadas"
          value={stats.done}
          sublabel="na safra"
          icon={CircleCheckBig}
        />
        <StatCard
          title="Metas trabalhadas"
          value={stats.workedProblems}
          sublabel="endereçadas"
          icon={ListChecks}
        />
        {showEvidencias ? (
          <StatCard
            title="Evidências registradas"
            value={stats.photoCount}
            sublabel="fotos em campo"
            icon={Camera}
          />
        ) : null}
        <StatCard
          title="Ações realizadas em"
          value={monthsValue}
          sublabel={monthsSublabel}
          icon={CalendarRange}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title="Ações realizadas"
        value={stats.done}
        sublabel={`de ${stats.planned} planejadas`}
        icon={ClipboardList}
      />
      <StatCard
        title="Concluídas"
        value={`${stats.completedPercent}%`}
        sublabel={`no prazo: ${stats.onTime}`}
        icon={CircleCheckBig}
      />
      <StatCard
        title="Metas trabalhadas"
        value={stats.workedProblems}
        sublabel={`de ${stats.totalProblems} mapeadas`}
        icon={ListChecks}
      />
      {/* Status geral é o único card com cor semântica (bolinha). */}
      <Card className="rounded-xl border border-border bg-card p-0 shadow-card!">
        <div className="p-5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">Status geral</p>
            <span
              aria-hidden
              className={cn(
                "ml-auto size-2.5 shrink-0 rounded-full",
                stats.healthy ? "bg-success" : "bg-warning"
              )}
            />
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {stats.healthy ? "No ritmo" : "Precisa atenção"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.healthy
              ? "execução em dia com o plano"
              : "há metas ou prazos em aberto"}
          </p>
        </div>
      </Card>
    </div>
  );
}

// ── FIX 3 — Metas sem plano (só interno) ──────────────────────────────

export function MetasSemPlanoBlock({
  problems,
  channelHref,
}: {
  problems: { id: string; title: string }[];
  channelHref: string;
}) {
  if (problems.length === 0) return null;

  return (
    <Card className="gap-3 border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {problems.length}{" "}
            {problems.length === 1
              ? "meta ainda sem plano de ação"
              : "metas ainda sem plano de ação"}
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {problems.map((problem) => (
              <li
                key={problem.id}
                className="truncate text-xs text-muted-foreground"
              >
                {problem.title}
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-warning hover:text-warning"
          nativeButton={false}
          render={<Link href={channelHref} />}
        >
          Ver metas
        </Button>
      </div>
    </Card>
  );
}

// ── FIX 4 — Resultado da meta (protagonista) ──────────────────────────

function ResultadoCard({
  problemId,
  resultado,
  mode,
  canEdit,
}: {
  problemId: string;
  resultado: string | null;
  mode: ReportMode;
  canEdit: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(resultado ?? "");
  const [pending, startTransition] = React.useTransition();

  // No externo, resultado vazio simplesmente não existe — não se expõe
  // lacuna interna para o canal.
  if (!resultado && mode === "externo") return null;

  function save() {
    startTransition(async () => {
      const result = await setProblemResultado({
        problemId,
        resultado: draft,
      });
      if (result.ok) {
        setEditing(false);
        toast.success("Resultado registrado.");
      } else {
        toast.error(result.error ?? "Não foi possível salvar.");
      }
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg bg-subtle p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Resultado
        </p>
        <Textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="O que esta meta gerou na prática? Ex: share de fungicidas voltou de 11% para 16%."
          className="mt-2 min-h-20 bg-card"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" variant="brand" onClick={save} disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(resultado ?? "");
              setEditing(false);
            }}
            disabled={pending}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="group/res rounded-lg bg-subtle p-4">
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Resultado
          </p>
          {mode === "interno" && canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto cursor-pointer text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/res:opacity-100 print:hidden"
            >
              <Pencil className="mr-1 inline size-3" />
              Editar
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-base leading-relaxed text-foreground">
          {resultado}
        </p>
      </div>
    );
  }

  // Vazio no interno. Editor: convite dashed clicável (a chamada
  // canônica pro DSM/CX registrar). Leitor: card muted informando o
  // débito, sem cursor pointer.
  if (!canEdit) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm italic text-muted-foreground">
        Sem resultado registrado.
      </div>
    );
  }
  return (
    <Button
      variant="outline"
      onClick={() => setEditing(true)}
      className="h-auto w-full justify-start gap-2 rounded-lg border-dashed p-4 text-sm font-normal text-muted-foreground hover:border-border-hover hover:bg-hover-surface hover:text-foreground print:hidden"
    >
      <Plus className="size-4" />
      Registrar resultado
    </Button>
  );
}

// ── FIX 4 — Bloco de meta ─────────────────────────────────────────────

/** Cor da barra por saúde da execução. Sem cinza: 33% em cinza escuro
 *  soaria "desligado", quando é "abaixo do esperado" — a leitura vira
 *  binária (verde acima de 75, âmbar abaixo). */
function progressClass(percent: number) {
  if (percent >= 75) return "[&_[data-slot=progress-indicator]]:bg-success";
  return "[&_[data-slot=progress-indicator]]:bg-warning";
}

export function MetaBlock({
  index,
  title,
  description,
  activities,
  mode,
  onOpenPhoto,
  isMeta = false,
  problemId,
  resultado = null,
  canEdit = false,
}: {
  index?: number;
  title: string;
  description: string | null;
  activities: ReportActivity[];
  mode: ReportMode;
  onOpenPhoto: (photo: ReportPhoto) => void;
  isMeta?: boolean;
  problemId?: string;
  resultado?: string | null;
  canEdit?: boolean;
}) {
  const { openActivity } = useActivityDrawer();
  const total = activities.length;
  const completed = activities.filter(
    (activity) => activity.status === "concluida"
  ).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const withPhotos = activities.filter((a) => a.photos.length > 0);
  const photoCount = withPhotos.reduce((sum, a) => sum + a.photos.length, 0);
  const groupPhotos = withPhotos.length > 0 && withPhotos.length <= 3;

  const showResponsible =
    new Set(activities.map((activity) => activity.responsibleName ?? "—"))
      .size > 1;

  return (
    <Card className="report-section gap-4">
      <CardHeader className="gap-1" style={{ breakAfter: "avoid" }}>
        {typeof index === "number" ? (
          <p className="text-xs uppercase tracking-wide text-muted-foreground tabular-nums">
            {String(index + 1).padStart(2, "0")} · Meta
          </p>
        ) : null}
        <CardTitle className="text-lg font-semibold leading-snug text-foreground">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="leading-relaxed">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {isMeta && problemId ? (
          <ResultadoCard
            problemId={problemId}
            resultado={resultado}
            mode={mode}
            canEdit={canEdit}
          />
        ) : null}

        {/* Progresso — peso maior no número, cor por saúde */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {completed} de {total}{" "}
              {total === 1 ? "atividade concluída" : "atividades concluídas"}
            </span>
            <span className="text-base font-semibold tabular-nums text-foreground">
              {percent}%
            </span>
          </div>
          <Progress
            value={percent}
            className={cn(
              "[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-muted",
              progressClass(percent)
            )}
          />
        </div>

        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade registrada para esta meta no recorte atual.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/50">
            {activities.map((activity) => (
              <ActivityLine
                key={activity.id}
                activity={activity}
                showResponsible={showResponsible}
                mode={mode}
                onOpen={openActivity}
              />
            ))}
          </div>
        )}

        {/* Evidências — agrupadas por atividade quando são poucas */}
        {photoCount > 0 ? (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Evidências ({photoCount})
              </p>
              {groupPhotos ? (
                <div className="flex flex-col gap-1">
                  {withPhotos.map((activity) => (
                    <EvidenceGroup
                      key={activity.id}
                      activity={activity}
                      onOpenPhoto={onOpenPhoto}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {withPhotos.flatMap((activity) =>
                    activity.photos.map((photo) => (
                      <GalleryThumb
                        key={photo.id}
                        photo={photo}
                        onClick={() => onOpenPhoto(photo)}
                        originLabel={activity.title}
                        originCategory={activity.category}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Evidências de UMA atividade, colapsáveis. */
function EvidenceGroup({
  activity,
  onOpenPhoto,
}: {
  activity: ReportActivity;
  onOpenPhoto: (photo: ReportPhoto) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const when = activity.lastExecution?.createdAt ?? activity.dueDate;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 text-left transition-colors hover:bg-hover-surface"
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-base",
                open ? "rotate-0" : "-rotate-90"
              )}
            />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {activity.title}
              </span>
              {when ? ` · ${formatDate(when, "dd MMM")}` : ""} ·{" "}
              {activity.photos.length}{" "}
              {activity.photos.length === 1 ? "foto" : "fotos"}
            </span>
          </button>
        }
      />
      <CollapsibleContent>
        <div className="grid grid-cols-3 gap-2 pt-1 pb-2 sm:grid-cols-4">
          {activity.photos.map((photo) => (
            <GalleryThumb
              key={photo.id}
              photo={photo}
              onClick={() => onOpenPhoto(photo)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── FIX 5 — Ritmo da safra ────────────────────────────────────────────

export function RitmoBlock({
  data,
  currentMonth,
}: {
  data: HeatmapMonth[];
  currentMonth: string;
}) {
  return (
    <Card className="report-section">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ritmo da safra</CardTitle>
        <CardDescription>
          Distribuição das ações ao longo dos meses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SeasonHeatmap data={data} currentMonth={currentMonth} />
      </CardContent>
    </Card>
  );
}

// ── FIX 6 — Números da safra (só interno) ─────────────────────────────

export function NumerosBlock({
  byStatus,
  byProblem,
  byCategory,
}: {
  byStatus: { status: string; total: number }[];
  byProblem: { label: string; total: number; completionPercent: number }[];
  byCategory: { label: string; total: number }[];
}) {
  // Um destaque por gráfico. Regra fixa: "por meta" → a meta com MENOR
  // % concluído (o débito). "Por categoria" → a de maior volume (onde
  // o esforço foi). Ambos em accent-brand — âmbar é reservado a
  // risco/atraso (StatusBadge, DeadlineText).
  const weakestProblem = React.useMemo(() => {
    if (byProblem.length === 0) return null;
    let index = 0;
    for (let i = 1; i < byProblem.length; i += 1) {
      if (byProblem[i].completionPercent < byProblem[index].completionPercent) {
        index = i;
      }
    }
    return index;
  }, [byProblem]);

  const topCategory = React.useMemo(() => {
    if (byCategory.length === 0) return null;
    let index = 0;
    for (let i = 1; i < byCategory.length; i += 1) {
      if (byCategory[i].total > byCategory[index].total) index = i;
    }
    return index;
  }, [byCategory]);

  return (
    <Card className="report-section">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Números da safra
        </CardTitle>
        <CardDescription>
          A execução do plano em três visões: status, meta e categoria.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Atividades por status</p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <ActivitiesStatusChart data={byStatus as any} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Atividades por meta</p>
            <ActivitiesByProblemChart
              data={byProblem}
              highlightIndex={weakestProblem}
            />
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium">Atividades por categoria</p>
            <ActivitiesByProblemChart
              data={byCategory}
              highlightIndex={topCategory}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── FIX 10 — Rodapé ───────────────────────────────────────────────────

export function ReportFooter({
  channelName,
  harvest,
  generatedAt,
  mode,
  adjustments,
}: {
  channelName: string;
  harvest: string | null;
  generatedAt: string;
  mode: ReportMode;
  /** Atrasadas + canceladas — no externo vira "ajustes de plano". */
  adjustments: number;
}) {
  return (
    <footer className="mt-8 border-t border-border py-6 text-center">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/70">
          Corteva Planner
        </span>{" "}
        · {channelName}
        {harvest ? ` · ${harvest}` : ""} · gerado em{" "}
        {formatLongDate(generatedAt)}
      </p>
      {mode === "externo" && adjustments > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {adjustments}{" "}
          {adjustments === 1
            ? "ajuste de plano ao longo da safra"
            : "ajustes de plano ao longo da safra"}
        </p>
      ) : null}
    </footer>
  );
}
