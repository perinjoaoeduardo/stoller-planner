import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ActivityStatus =
  | "planejada"
  | "em_andamento"
  | "concluida"
  | "atrasada"
  | "nao_feita";

export const ACTIVITY_STATUSES: ActivityStatus[] = [
  "planejada",
  "em_andamento",
  "concluida",
  "atrasada",
  "nao_feita",
];

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
  nao_feita: "Não feita",
};

const STATUS_STYLES: Record<
  ActivityStatus,
  { variant: React.ComponentProps<typeof Badge>["variant"]; className?: string }
> = {
  planejada: { variant: "outline" },
  em_andamento: { variant: "secondary" },
  concluida: {
    variant: "outline",
    className:
      "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  atrasada: {
    variant: "outline",
    className:
      "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  nao_feita: { variant: "destructive" },
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
