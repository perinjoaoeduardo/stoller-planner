import { z } from "zod";

import { ACTIVITY_CATEGORIES } from "@/lib/config";

/**
 * Regras de obrigatoriedade da atividade — ÚNICO ponto de verdade.
 * Formulários (cockpit do DSM e fluxo Registrar) e server actions leem
 * daqui em vez de espalhar validações hardcoded.
 *
 * Decisões de produto vigentes:
 * - FOTO é opcional (incentivo, não bloqueio) — deixou de ser exigida.
 * - DESCRIÇÃO (uma frase do que foi feito) é o mínimo obrigatório.
 * - CATEGORIA é obrigatória sempre que uma atividade passa a existir.
 * - PROBLEMA é obrigatório SE o plano tem ≥1 problema cadastrado;
 *   sem problemas no plano, o campo some do formulário.
 * - DATA/HORA de conclusão são automáticas (now() no servidor), nunca
 *   digitadas pelo usuário.
 */

/** Descrição curta do que foi feito: sempre obrigatória. */
export function isDescriptionRequired(): boolean {
  return true;
}

/** Categoria: obrigatória em toda criação/edição de atividade. */
export function isCategoryRequired(): boolean {
  return true;
}

/** Problema: obrigatório apenas quando o plano tem problemas cadastrados. */
export function isProblemRequired(plan: { problemCount: number }): boolean {
  return plan.problemCount > 0;
}

/**
 * Monta o schema zod do formulário de atividade conforme as regras.
 * O campo problema entra como obrigatório ou é livre (quando o plano
 * não tem problemas, a UI esconde o campo).
 */
export function buildActivitySchema(plan: { problemCount: number }) {
  const problemRequired = isProblemRequired(plan);

  return z.object({
    title: z
      .string()
      .trim()
      .min(3, "Informe um título com pelo menos 3 caracteres."),
    category: z.enum(
      ACTIVITY_CATEGORIES,
      "Selecione a categoria da atividade."
    ),
    problemId: z
      .string()
      .nullable()
      .refine(
        (value) => !problemRequired || !!value,
        "Vincule a atividade a um problema do plano."
      ),
    branchId: z.string().nullable(),
    responsibleId: z.string().nullable(),
    dueDate: z.string().nullable(),
    description: z.string(),
    status: z.enum(
      ["planejada", "concluida", "atrasada", "nao_feita"],
      "Selecione um status válido."
    ),
  });
}

export type ActivityFormValues = z.infer<
  ReturnType<typeof buildActivitySchema>
>;

