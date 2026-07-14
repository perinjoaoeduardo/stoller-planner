import type { LucideIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

type IconBoxSize = "sm" | "md" | "lg";

const BOX_SIZES: Record<IconBoxSize, { box: string; icon: string }> = {
  sm: { box: "size-7", icon: "size-3.5" }, // timeline, popover
  md: { box: "size-8", icon: "size-4" }, // tabelas
  lg: { box: "size-10", icon: "size-5" }, // cards de fluxo, escolha inicial
};

/**
 * Quadradinho de ícone canônico (camada 3). O átomo mais reusado do
 * app: tabelas, listas de fluxo, popover do calendário, timeline,
 * wizard, telas de escolha e sucesso.
 */
export function IconBox({
  icon: Icon,
  size = "md",
  tooltip,
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  size?: IconBoxSize;
  tooltip?: string;
  className?: string;
  iconClassName?: string;
}) {
  const s = BOX_SIZES[size];
  const box = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-muted",
        s.box,
        className
      )}
    >
      <Icon className={cn("text-foreground/70", s.icon, iconClassName)} />
    </span>
  );

  if (!tooltip) return box;

  return (
    <Tooltip>
      <TooltipTrigger render={box} />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/** Atalho: IconBox já resolvendo o ícone da categoria (mapa global). */
export function CategoryIconBox({
  category,
  size = "md",
  withTooltip = false,
  className,
  iconClassName,
}: {
  category: ActivityCategory | null;
  size?: IconBoxSize;
  withTooltip?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <IconBox
      icon={categoryIcon(category)}
      size={size}
      tooltip={
        withTooltip && category ? CATEGORY_LABELS[category] : undefined
      }
      className={className}
      iconClassName={iconClassName}
    />
  );
}
