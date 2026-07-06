import {
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  Home,
  Map,
  Store,
  type LucideIcon,
} from "lucide-react";

export type Role = "DSM" | "RTV" | "RDC" | "CX";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Navegação por perfil — a sidebar e o command palette leem daqui para
 * refletir exatamente o que o role logado pode acessar.
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  CX: [
    { title: "Início", href: "/", icon: Home },
    { title: "Regiões", href: "/regioes", icon: Map },
    { title: "Canais", href: "/canais", icon: Store },
    { title: "Atividades", href: "/atividades", icon: ClipboardList },
    { title: "Registrar execução", href: "/registrar", icon: ClipboardCheck },
    { title: "Relatórios", href: "/relatorios", icon: ChartColumn },
  ],
  DSM: [
    { title: "Início", href: "/", icon: Home },
    { title: "Meus Canais", href: "/canais", icon: Store },
    { title: "Atividades", href: "/atividades", icon: ClipboardList },
    { title: "Registrar execução", href: "/registrar", icon: ClipboardCheck },
    { title: "Relatórios", href: "/relatorios", icon: ChartColumn },
  ],
  RTV: [
    { title: "Início", href: "/", icon: Home },
    {
      title: "Minhas Atividades",
      href: "/minhas-atividades",
      icon: ClipboardList,
    },
    { title: "Registrar execução", href: "/registrar", icon: ClipboardCheck },
  ],
  RDC: [
    { title: "Início", href: "/", icon: Home },
    {
      title: "Minhas Atividades",
      href: "/minhas-atividades",
      icon: ClipboardList,
    },
    { title: "Registrar execução", href: "/registrar", icon: ClipboardCheck },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  DSM: "DSM — Gestor de canais",
  RTV: "RTV — Consultor técnico",
  RDC: "RDC — Representante",
  CX: "CX — Excelência comercial",
};
