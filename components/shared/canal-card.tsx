import { ClickableCard, NeutralChip } from "@/components/shared/clickable-card";
import { HealthMark } from "@/components/shared/health-mark";
import { Progress } from "@/components/ui/progress";
import type { ChannelHealth } from "@/lib/plan-utils";

export type CanalCardData = {
  id: string;
  name: string;
  region?: string;
  problemCount?: number;
  activityCount?: number;
  branchCount?: number;
  completedPercent: number;
  health: ChannelHealth;
  lateCount: number;
};

const PROGRESS_CLASS =
  "flex-1 [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-primary [&_[data-slot=progress-track]]:h-1";

/**
 * Card de canal ÚNICO — `compact` (home: 2 linhas densas, saúde inline
 * no título) e `full` (Meus Canais: título+região, chips de contexto,
 * barra e linha de saúde). O status é o único sinal de cor semântica.
 */
export function CanalCard({
  canal,
  variant = "full",
  href,
}: {
  canal: CanalCardData;
  variant?: "compact" | "full";
  href: string;
}) {
  const late =
    canal.health !== "em_dia" && canal.lateCount > 0 ? canal.lateCount : 0;

  // ── Compact (home) — duas linhas, sem seta, sem chips ────────────────
  if (variant === "compact") {
    return (
      <ClickableCard href={href} className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {canal.name}
          </p>
          <HealthMark health={canal.health} />
        </div>
        <div className="flex items-center gap-2.5">
          <Progress value={canal.completedPercent} className={PROGRESS_CLASS} />
          <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
            {canal.completedPercent}%
          </span>
          {late > 0 ? (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              · {late} {late === 1 ? "atrasada" : "atrasadas"}
            </span>
          ) : null}
        </div>
      </ClickableCard>
    );
  }

  // ── Full (Meus Canais) ───────────────────────────────────────────────
  return (
    <ClickableCard href={href} showArrow className="flex flex-col gap-3 p-4">
      <div className="pr-8">
        <p className="truncate text-sm font-semibold text-foreground">
          {canal.name}
        </p>
        {canal.region ? (
          <p className="text-sm text-muted-foreground">{canal.region}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pr-8">
        <NeutralChip>
          {canal.problemCount ?? 0}{" "}
          {canal.problemCount === 1 ? "meta" : "metas"}
        </NeutralChip>
        <NeutralChip>
          {canal.activityCount ?? 0}{" "}
          {canal.activityCount === 1 ? "atividade" : "atividades"}
        </NeutralChip>
        <NeutralChip>
          {canal.branchCount ?? 0}{" "}
          {canal.branchCount === 1 ? "filial" : "filiais"}
        </NeutralChip>
      </div>

      <div className="flex items-center gap-3 pr-8">
        <Progress value={canal.completedPercent} className={PROGRESS_CLASS} />
        <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
          {canal.completedPercent}% concluídas
        </span>
      </div>

      <div className="mt-0.5 flex items-center gap-2">
        <HealthMark health={canal.health} />
        {late > 0 ? (
          <span className="text-xs text-muted-foreground">
            · {late} {late === 1 ? "atrasada" : "atrasadas"}
          </span>
        ) : null}
      </div>
    </ClickableCard>
  );
}
