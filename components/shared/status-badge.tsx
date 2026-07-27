import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ActivityStatus =
  | "planejada"
  | "concluida"
  | "atrasada"
  | "nao_feita";

export const ACTIVITY_STATUSES: ActivityStatus[] = [
  "planejada",
  "concluida",
  "atrasada",
  "nao_feita",
];

/**
 * Atividade ABERTA = planejada ou atrasada — predicado canônico (antes
 * redefinido em ~11 arquivos). Encerradas: concluída e cancelada.
 */
export const OPEN_STATUSES: ActivityStatus[] = ["planejada", "atrasada"];

export function isOpenStatus(status: ActivityStatus): boolean {
  return status === "planejada" || status === "atrasada";
}

/**
 * ORDEM CANÔNICA de status em qualquer lista (existe em UM arquivo só).
 * Atrasada → Planejada → Concluída → Cancelada: primeiro o que cobra
 * ação, por último o que já está encerrado. A regra vence a data: uma
 * concluída de ontem entra DEPOIS de uma planejada do mês que vem,
 * porque o que a lista responde é "o que eu faço agora", não "o que
 * aconteceu quando". A data só desempata dentro do mesmo status.
 */
export const STATUS_ORDER: Record<ActivityStatus, number> = {
  atrasada: 0,
  planejada: 1,
  concluida: 2,
  nao_feita: 3,
};

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  planejada: "Planejada",
  concluida: "Concluída",
  atrasada: "Atrasada",
  nao_feita: "Cancelada",
};

/**
 * Cor canônica de cada status EM GRÁFICO — a mesma em todas as telas.
 * Segue a semântica dos badges: azul = planejada, verde = concluída,
 * âmbar = atrasada, cancelada é neutra.
 */
export const STATUS_CHART_COLORS: Record<ActivityStatus, string> = {
  planejada: "var(--accent-brand)",
  concluida: "var(--success)",
  atrasada: "var(--warning)",
  nao_feita: "var(--border-hover)",
};

/**
 * Badge de status ÚNICO do app (Constituição, item 2). Os três estados
 * vivos têm cor própria — azul = planejada (vai acontecer), verde =
 * concluída (aconteceu), âmbar = atrasada (devia ter acontecido) — e
 * cancelada fica neutra, porque saiu do jogo. NUNCA vermelho em badge:
 * vermelho é só ação destrutiva e erro de formulário.
 */
const STATUS_STYLES: Record<
  ActivityStatus,
  { variant: React.ComponentProps<typeof Badge>["variant"]; className?: string }
> = {
  planejada: {
    variant: "outline",
    className: "border-transparent bg-info-bg text-info-fg",
  },
  concluida: {
    variant: "outline",
    className: "border-transparent bg-success-bg text-success-fg",
  },
  atrasada: {
    variant: "outline",
    className: "border-transparent bg-warning-bg text-warning-fg",
  },
  nao_feita: { variant: "outline", className: "text-muted-foreground" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ActivityStatus;
  className?: string;
}) {
  const config = STATUS_STYLES[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
