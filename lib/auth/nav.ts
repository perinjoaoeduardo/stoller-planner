import {
  BrushCleaning,
  ChartColumn,
  ClipboardList,
  FileText,
  Home,
  ListTodo,
  Map,
  Radar,
  Store,
  type LucideIcon,
} from "lucide-react";

export type Role = "DSM" | "RTV" | "CX";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Navegação por perfil — a sidebar e o command palette leem daqui para
 * refletir exatamente o que o role logado pode acessar.
 *
 * "Nova atividade" NÃO vive aqui: virou ação universal, no botão ao lado
 * da busca (content-topbar). Calendário também não é item próprio: é uma
 * visão dentro de Atividades/Minhas Atividades (ver ViewSwitch).
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  CX: [
    { title: "Início", href: "/visao-geral", icon: Home },
    { title: "Regiões", href: "/regioes", icon: Map },
    { title: "Canais", href: "/canais", icon: Store },
    { title: "Acompanhamento", href: "/acompanhamento", icon: Radar },
    { title: "Relatórios", href: "/relatorios", icon: ChartColumn },
  ],
  DSM: [
    { title: "Início", href: "/", icon: Home },
    { title: "Meus Canais", href: "/canais", icon: Store },
    { title: "Atividades", href: "/atividades", icon: ClipboardList },
    { title: "Pendências", href: "/pendencias", icon: BrushCleaning },
    { title: "Relatórios", href: "/relatorios", icon: ChartColumn },
  ],
  RTV: [
    { title: "Início", href: "/", icon: Home },
    { title: "Meus Canais", href: "/meus-canais", icon: Store },
    {
      title: "Minhas Atividades",
      href: "/minhas-atividades",
      icon: ListTodo,
    },
    { title: "Pendências", href: "/pendencias", icon: BrushCleaning },
    { title: "Relatórios", href: "/relatorios", icon: FileText },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  DSM: "DSM — Gestor de canais",
  RTV: "RTV — Consultor técnico",
  CX: "CX — Excelência comercial",
};
