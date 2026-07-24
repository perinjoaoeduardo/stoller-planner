import {
  ClipboardList,
  GraduationCap,
  Megaphone,
  Route,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { ActivityCategory } from "@/lib/config";

/**
 * MAPA GLOBAL categoria → ícone (Constituição, item 7: existe em UM
 * arquivo só). Reunião de resultado com gerente = Users, Treinamento e
 * capacitação = GraduationCap, Rodada com o canal = Route, Geração de
 * demanda = Megaphone. Fallback neutro pra categoria nula.
 */
export const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  reuniao_gerente: Users,
  treinamento: GraduationCap,
  rodada_canal: Route,
  geracao_demanda: Megaphone,
};

export function categoryIcon(category: ActivityCategory | null): LucideIcon {
  return category ? CATEGORY_ICONS[category] : ClipboardList;
}

/**
 * Categoria é distinguida pelo ÍCONE + rótulo, não por cor. As quatro
 * cores de pilar eram idênticas (mesmo sky-blue) — não separavam nada e
 * ainda competiam com o azul Corteva. Todas neutras agora (camada 3 +
 * foreground suave); a cor semântica fica livre para os alarmes.
 */
const NEUTRAL_CATEGORY = { bg: "bg-muted", fg: "text-foreground/70" };

export const CATEGORY_COLORS: Record<
  ActivityCategory,
  { bg: string; fg: string }
> = {
  reuniao_gerente: NEUTRAL_CATEGORY,
  treinamento: NEUTRAL_CATEGORY,
  rodada_canal: NEUTRAL_CATEGORY,
  geracao_demanda: NEUTRAL_CATEGORY,
};

export function categoryColors(category: ActivityCategory | null): {
  bg: string;
  fg: string;
} {
  return category ? CATEGORY_COLORS[category] : NEUTRAL_CATEGORY;
}
