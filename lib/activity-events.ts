import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ImageMinus,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

/**
 * Rótulo + ícone da linha do tempo da atividade — ÚNICA fonte
 * (Constituição, item 7). Antes vivia duplicado na página da atividade
 * e no drawer, e já tinha divergido (a página não conhecia
 * `problema_vinculado` e mostrava o tipo cru).
 */
export const EVENT_LABELS: Record<string, string> = {
  criada: "Atividade criada",
  editada: "Atividade editada",
  status_alterado: "Status alterado",
  foto_adicionada: "Foto adicionada",
  foto_removida: "Foto removida",
  execucao_registrada: "Execução registrada",
  reaberta: "Atividade reaberta",
  problema_vinculado: "Meta vinculada",
};

/** Ícone semântico por evento; conclusão ganha o check verde da vida. */
export function eventIcon(type: string, description: string | null): LucideIcon {
  if (type === "status_alterado" && description?.includes('para "Concluída"')) {
    return CheckCircle2;
  }
  if (type === "execucao_registrada" && description) {
    return MessageSquare;
  }
  const icons: Record<string, LucideIcon> = {
    criada: Plus,
    editada: Pencil,
    status_alterado: RefreshCw,
    foto_adicionada: Camera,
    foto_removida: ImageMinus,
    execucao_registrada: ClipboardCheck,
    reaberta: RotateCcw,
    problema_vinculado: Link2,
  };
  return icons[type] ?? RefreshCw;
}
