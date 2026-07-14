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
