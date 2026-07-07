/**
 * Prova da migração de responsible_id → activity_assignees.
 * Confere que toda atividade com responsible_id tem a linha
 * correspondente na tabela nova.
 *
 * Uso: npx tsx scripts/prova-assignees.ts (rodar da raiz do projeto)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const [activitiesRes, assigneesRes] = await Promise.all([
    admin.from("activities").select("id, responsible_id"),
    admin.from("activity_assignees").select("id, activity_id, profile_id"),
  ]);
  if (activitiesRes.error) throw activitiesRes.error;
  if (assigneesRes.error) throw assigneesRes.error;

  const withResponsible = activitiesRes.data.filter(
    (activity) => activity.responsible_id !== null
  );
  const assigneePairs = new Set(
    assigneesRes.data.map((row) => `${row.activity_id}:${row.profile_id}`)
  );
  const missing = withResponsible.filter(
    (activity) =>
      !assigneePairs.has(`${activity.id}:${activity.responsible_id}`)
  );

  console.log(`Atividades no total:                 ${activitiesRes.data.length}`);
  console.log(`Atividades com responsible_id:       ${withResponsible.length}`);
  console.log(`Linhas em activity_assignees:        ${assigneesRes.data.length}`);
  console.log(`responsible_id SEM linha de assignee: ${missing.length}`);

  if (missing.length > 0) {
    console.error("FALHA: há responsáveis não migrados:", missing);
    process.exit(1);
  }
  console.log("OK: todos os responsible_id têm linha em activity_assignees.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
