import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

/**
 * Chip de categoria NEUTRO (Constituição, item 2): a categoria
 * contextualiza sem gastar cor — quem grita é o StatusBadge. Ícone do
 * mapa global + nome sobre camada 3.
 */
export function CategoryBadge({
  category,
  className,
}: {
  category: ActivityCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent bg-muted text-foreground", className)}
    >
      <Icon aria-hidden="true" className="text-foreground/70" />
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
