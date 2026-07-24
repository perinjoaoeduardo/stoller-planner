import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type ActivityCategory } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Chip de categoria — só o rótulo, em neutro. Sem cor (as 4 eram
 * idênticas, não separavam nada) e sem ícone (o texto já nomeia a
 * categoria por extenso). Quem sinaliza alarme é o StatusBadge; a
 * categoria é contexto calmo.
 */
export function CategoryBadge({
  category,
  className,
}: {
  category: ActivityCategory;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent bg-muted text-foreground/70",
        className
      )}
    >
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
