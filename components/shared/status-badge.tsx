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

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  planejada: "Planejada",
  concluida: "Concluída",
  atrasada: "Atrasada",
  nao_feita: "Cancelada",
};

/**
 * Badge de status ÚNICO do app (Constituição, item 2): âmbar é o alerta
 * de atraso, verde é conclusão, o resto é neutro. NUNCA vermelho em
 * badge — o vermelho pertence ao texto de prazo vencido (lib/deadline).
 */
const STATUS_STYLES: Record<
  ActivityStatus,
  { variant: React.ComponentProps<typeof Badge>["variant"]; className?: string }
> = {
  planejada: { variant: "outline", className: "text-foreground" },
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
