/**
 * Constantes e tipos da camada de pendências que precisam ser
 * importados tanto do server (queries em lib/db/pendencias) quanto de
 * client components (KPI filtro). Fica fora de /db para não arrastar
 * next/headers e o cliente Supabase pro bundle do cliente.
 */

export const PENDENCY_TYPES = [
  "sem_foto",
  "sem_problema",
  "sem_categoria",
] as const;

export type PendencyType = (typeof PENDENCY_TYPES)[number];

export const PENDENCY_LABELS: Record<PendencyType, string> = {
  sem_foto: "Sem foto",
  sem_problema: "Sem meta vinculada",
  sem_categoria: "Sem categoria",
};

export function isPendencyType(value: string | null): value is PendencyType {
  return (
    value === "sem_foto" || value === "sem_problema" || value === "sem_categoria"
  );
}
