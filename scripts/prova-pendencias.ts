/**
 * Prova dos contadores de pendências contra o banco (service role).
 * Replica a regra de lib/db/pendencias.ts com queries planas e
 * independentes, para conferir os números da UI.
 *
 * Uso: npx tsx prova-pendencias.ts (rodar da raiz do projeto)
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
  const [channelsRes, plansRes, problemsRes, activitiesRes, photosRes] =
    await Promise.all([
      admin.from("channels").select("id, name"),
      admin.from("plans").select("id, channel_id, status"),
      admin.from("problems").select("id, plan_id"),
      admin
        .from("activities")
        .select("id, plan_id, status, category, problem_id"),
      admin.from("activity_photos").select("id, activity_id"),
    ]);
  for (const res of [channelsRes, plansRes, problemsRes, activitiesRes, photosRes]) {
    if (res.error) throw res.error;
  }

  const activePlans = plansRes.data!.filter((p) => p.status === "ativo");
  const planChannel = new Map(activePlans.map((p) => [p.id, p.channel_id]));
  const channelName = new Map(channelsRes.data!.map((c) => [c.id, c.name]));

  const problemsByPlan = new Map<string, number>();
  for (const pr of problemsRes.data!) {
    problemsByPlan.set(pr.plan_id, (problemsByPlan.get(pr.plan_id) ?? 0) + 1);
  }
  const photosByActivity = new Map<string, number>();
  for (const ph of photosRes.data!) {
    photosByActivity.set(
      ph.activity_id,
      (photosByActivity.get(ph.activity_id) ?? 0) + 1
    );
  }

  type Counts = { sem_foto: number; sem_problema: number; sem_categoria: number };
  const byChannel = new Map<string, Counts>();
  const totals: Counts = { sem_foto: 0, sem_problema: 0, sem_categoria: 0 };

  for (const a of activitiesRes.data!) {
    const chId = planChannel.get(a.plan_id);
    if (!chId) continue; // atividade fora de plano ativo
    const counts =
      byChannel.get(chId) ??
      byChannel
        .set(chId, { sem_foto: 0, sem_problema: 0, sem_categoria: 0 })
        .get(chId)!;
    const done = a.status === "concluida";
    const planHasProblems = (problemsByPlan.get(a.plan_id) ?? 0) > 0;

    if (done && !(photosByActivity.get(a.id) ?? 0)) {
      counts.sem_foto++;
      totals.sem_foto++;
    }
    if (done && !a.problem_id && planHasProblems) {
      counts.sem_problema++;
      totals.sem_problema++;
    }
    if (!a.category) {
      counts.sem_categoria++;
      totals.sem_categoria++;
    }
  }

  console.log("=== Pendências por canal (planos ativos) ===");
  const rows = [...byChannel.entries()]
    .map(([id, c]) => ({
      canal: channelName.get(id) ?? id,
      ...c,
      total: c.sem_foto + c.sem_problema + c.sem_categoria,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total || a.canal.localeCompare(b.canal));
  for (const r of rows) {
    console.log(
      `${r.canal}: total=${r.total} (sem_foto=${r.sem_foto}, sem_problema=${r.sem_problema}, sem_categoria=${r.sem_categoria})`
    );
  }
  const grand = totals.sem_foto + totals.sem_problema + totals.sem_categoria;
  console.log("--- Totais (visão CX) ---");
  console.log(
    `total=${grand} (sem_foto=${totals.sem_foto}, sem_problema=${totals.sem_problema}, sem_categoria=${totals.sem_categoria})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
