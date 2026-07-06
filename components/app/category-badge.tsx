import {
  GraduationCap,
  Megaphone,
  Presentation,
  Route,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Badge de categoria da atividade. Tons neutros/azulados de propósito:
 * a categoria contextualiza, quem grita é o <StatusBadge /> (verde,
 * âmbar, vermelho). Ícone lucide distinto por categoria.
 */

const CATEGORY_STYLES: Record<
  ActivityCategory,
  { icon: LucideIcon; className: string }
> = {
  reuniao_gerente: {
    icon: Presentation,
    className:
      "border-transparent bg-[#0063A7]/10 text-[#0063A7] dark:bg-[#0063A7]/25 dark:text-[#8FC3E8]",
  },
  treinamento: {
    icon: GraduationCap,
    className:
      "border-transparent bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  rodada_canal: {
    icon: Route,
    className:
      "border-transparent bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  },
  geracao_demanda: {
    icon: Megaphone,
    className:
      "border-transparent bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  },
};

export function CategoryBadge({
  category,
  className,
}: {
  category: ActivityCategory;
  className?: string;
}) {
  const config = CATEGORY_STYLES[category];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon aria-hidden="true" />
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
