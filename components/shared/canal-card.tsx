import { ClickableCard, NeutralChip } from "@/components/shared/clickable-card";
import { Progress } from "@/components/ui/progress";
import type { ChannelHealth } from "@/lib/plan-utils";
import { HEALTH_CONFIG } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";

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

const HEALTH_LABEL_CLASS: Record<ChannelHealth, string> = {
  critico: "font-medium text-destructive",
  atencao: "font-medium text-warning",
  em_dia: "font-medium text-success-fg",
};

/**
 * Card de canal ÚNICO (home = compact, Meus Canais = full), com o DNA
 * do card de Relatórios: título contido, chips neutros de contexto,
 * barra+% numa linha e o status como único sinal de cor semântica.
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
  const full = variant === "full";

  return (
    <ClickableCard href={href} showArrow className="flex flex-col gap-3 p-4">
      <div className="pr-8">
        <p className="truncate text-sm font-semibold text-foreground">
          {canal.name}
        </p>
        {full && canal.region ? (
          <p className="text-sm text-muted-foreground">{canal.region}</p>
        ) : null}
      </div>

      {full ? (
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
      ) : null}

      <div className="flex items-center gap-3 pr-8">
        <Progress
          value={canal.completedPercent}
          className="flex-1 [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-foreground/70 [&_[data-slot=progress-track]]:h-1"
        />
        <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
          {canal.completedPercent}% concluídas
        </span>
      </div>

      <div className="mt-0.5 flex items-center gap-2 text-xs">
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 translate-y-[0.5px] rounded-full",
            HEALTH_CONFIG[canal.health].dotClass
          )}
        />
        <span className={HEALTH_LABEL_CLASS[canal.health]}>
          {HEALTH_CONFIG[canal.health].label}
        </span>
        {canal.health !== "em_dia" && canal.lateCount > 0 ? (
          <span className="text-muted-foreground">
            · {canal.lateCount}{" "}
            {canal.lateCount === 1 ? "atrasada" : "atrasadas"}
          </span>
        ) : null}
      </div>
    </ClickableCard>
  );
}
