import { redirect } from "next/navigation";

/** Rota antiga do stub (Bloco 2) — o fluxo real vive em /registrar. */
export default function RegistrarExecucaoPage() {
  redirect("/registrar");
}
