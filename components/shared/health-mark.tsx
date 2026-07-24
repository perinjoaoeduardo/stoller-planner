import type { ChannelHealth } from "@/lib/plan-utils";
import { HEALTH_CONFIG } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";

/**
 * Selo de saúde ÚNICO (dot + label) — a única leitura visual do
 * ChannelHealth em cards, tabelas e drill-downs. Antes existiam 4
 * markups à mão (canal-card, home DSM, tabela de saúde, card de
 * região); agora todos leem daqui. Uma cor só de alarme: âmbar =
 * precisa de olhar (atenção/crítico); em dia é neutro. A severidade
 * está no rótulo, não numa terceira cor.
 */
const LABEL_CLASS: Record<ChannelHealth, string> = {
  critico: "font-medium text-warning",
  atencao: "font-medium text-warning",
  em_dia: "font-medium text-muted-foreground",
};

export function HealthMark({
  health,
  size = "sm",
  className,
}: {
  health: ChannelHealth;
  /** sm = cards densos (dot 1.5, texto xs); md = tabelas (dot 2, texto sm). */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center whitespace-nowrap",
        size === "sm" ? "gap-1.5 text-xs" : "gap-2 text-sm",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 rounded-full",
          size === "sm" ? "size-1.5" : "size-2",
          HEALTH_CONFIG[health].dotClass
        )}
      />
      <span className={LABEL_CLASS[health]}>{HEALTH_CONFIG[health].label}</span>
    </span>
  );
}
