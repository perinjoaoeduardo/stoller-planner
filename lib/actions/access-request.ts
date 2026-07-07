"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * O planner tem acesso CONTROLADO: contas são criadas pela
 * administração (CX) com vínculos. O /registro não cria usuário no
 * Auth — apenas grava a solicitação em access_requests para o CX
 * avaliar. Quando o SSO Microsoft entrar em produção, esta tela deve
 * ser substituída pelo fluxo SSO e access_requests vira a fila de
 * aprovação.
 */

const requestSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  requestedRole: z.enum(["DSM", "RTV", "CX"]),
  message: z.string().trim().max(500).optional(),
});

export type AccessRequestInput = z.infer<typeof requestSchema>;

type ActionResult = { ok: true } | { ok: false; error: string };

export async function submitAccessRequest(
  input: AccessRequestInput
): Promise<ActionResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Confira os campos e tente novamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("access_requests").insert({
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    requested_role: parsed.data.requestedRole,
    message: parsed.data.message || null,
  });

  if (error) {
    return {
      ok: false,
      error: "Não foi possível enviar agora. Tente novamente em instantes.",
    };
  }
  return { ok: true };
}
