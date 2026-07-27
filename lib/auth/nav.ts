import {
  BrushCleaning,
  ChartColumn,
  ClipboardList,
  Home,
  ListTodo,
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
    { title: "Canais", href: "/canais", icon: Store },
    // O CX ve TUDO de todos os canais; a filtragem (Regional -> Canal ->
    // Filial -> Meta, mais responsavel e categoria) e o que torna a lista
    // nacional navegavel.
    { title: "Todas as Atividades", href: "/atividades", icon: ClipboardList },
    { title: "Acompanhamento", href: "/acompanhamento", icon: Radar },
    { title: "Relatórios", href: "/relatorios", icon: ChartColumn },
  ],
  DSM: [
    { title: "Início", href: "/", icon: Home },
    { title: "Meus Canais", href: "/canais", icon: Store },
    // "Todas as atividades": o DSM tem as dele E as do time na mesma
    // tela — o rótulo tem de deixar claro que a lista não é pessoal.
    { title: "Todas Atividades", href: "/atividades", icon: ClipboardList },
    { title: "Pendências", href: "/pendencias", icon: BrushCleaning },
    { title: "Relatórios", href: "/relatorios", icon: ChartColumn },
  ],
  // RTV: menu curto de campo. "Relatórios" saiu — o relatório de safra
  // já abre por dentro de cada canal (botão no cabeçalho); um item de
  // menu que só lista canais para escolher era um caminho duplicado e
  // um destino de gestor, não de consultor.
  RTV: [
    { title: "Início", href: "/", icon: Home },
    { title: "Meus Canais", href: "/meus-canais", icon: Store },
    {
      title: "Minhas Atividades",
      href: "/minhas-atividades",
      icon: ListTodo,
    },
    { title: "Pendências", href: "/pendencias", icon: BrushCleaning },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  DSM: "DSM — Gestor de canais",
  RTV: "RTV — Consultor técnico",
  CX: "CX — Excelência comercial",
};
