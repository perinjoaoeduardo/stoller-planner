import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

/**
 * Chip de categoria com a cor do pilar (emenda jul/2026 à Constituição):
 * pastel de identidade, não alarme — quem grita continua sendo o
 * StatusBadge. Ícone e cor vêm dos mapas globais.
 */
export function CategoryBadge({
  category,
  className,
}: {
  category: ActivityCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  const colors = CATEGORY_COLORS[category];

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", colors.bg, colors.fg, className)}
    >
      <Icon aria-hidden="true" />
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
