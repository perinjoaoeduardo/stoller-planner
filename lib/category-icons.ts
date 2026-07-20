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
 * MAPA GLOBAL categoria → cor de pilar. Tons pastel definidos em
 * globals.css (--cat-*): identificam o tipo de ação em toda a
 * experiência (icon box, badge, wizard) sem competir com os alarmes
 * semânticos nem com o azul Corteva de ação.
 */
export const CATEGORY_COLORS: Record<
  ActivityCategory,
  { bg: string; fg: string }
> = {
  reuniao_gerente: { bg: "bg-cat-reuniao-bg", fg: "text-cat-reuniao-fg" },
  treinamento: {
    bg: "bg-cat-treinamento-bg",
    fg: "text-cat-treinamento-fg",
  },
  rodada_canal: { bg: "bg-cat-rodada-bg", fg: "text-cat-rodada-fg" },
  geracao_demanda: { bg: "bg-cat-demanda-bg", fg: "text-cat-demanda-fg" },
};

/** Fallback neutro pra categoria nula (camada 3 + foreground suave). */
export function categoryColors(category: ActivityCategory | null): {
  bg: string;
  fg: string;
} {
  return category
    ? CATEGORY_COLORS[category]
    : { bg: "bg-muted", fg: "text-foreground/70" };
}
