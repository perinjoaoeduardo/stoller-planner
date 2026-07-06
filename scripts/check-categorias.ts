/**
 * Confere a distribuição de categorias das atividades no banco:
 * - contagem por categoria (nenhuma NULL permitida)
 * - o canal vitrine (AgroVale Distribuidora) precisa ter as 4 categorias
 *
 * Uso: npx tsx scripts/check-categorias.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Carrega .env.local manualmente (sem depender de dotenv)
const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function main() {
  const { data: activities, error } = await supabase
    .from("activities")
    .select("id, title, category, plan:plans(channel:channels(name))");
  if (error) throw error;

  const counts = new Map<string, number>();
  const nulls: string[] = [];
  const vitrine = new Set<string>();

  for (const activity of activities ?? []) {
    const category = activity.category ?? "NULL";
    counts.set(category, (counts.get(category) ?? 0) + 1);
    if (!activity.category) nulls.push(activity.title);
    const channelName = (
      activity.plan as unknown as { channel: { name: string } } | null
    )?.channel?.name;
    if (channelName === "AgroVale Distribuidora" && activity.category) {
      vitrine.add(activity.category);
    }
  }

  console.log(`Total de atividades: ${activities?.length ?? 0}`);
  console.log("\nContagem por categoria:");
  for (const [category, count] of [...counts.entries()].sort()) {
    console.log(`  ${category}: ${count}`);
  }

  if (nulls.length > 0) {
    console.error(`\nERRO: ${nulls.length} atividade(s) sem categoria:`);
    nulls.forEach((title) => console.error(`  - ${title}`));
    process.exit(1);
  }
  console.log("\nNenhuma atividade sem categoria. ✔");

  console.log(
    `\nCanal vitrine (AgroVale Distribuidora): ${vitrine.size}/4 categorias — ${[...vitrine].sort().join(", ")}`
  );
  if (vitrine.size < 4) {
    console.error("ERRO: canal vitrine não tem as 4 categorias representadas.");
    process.exit(1);
  }
  console.log("Canal vitrine com as 4 categorias. ✔");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
