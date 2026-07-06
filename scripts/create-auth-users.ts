/**
 * Cria os usuários de auth do protótipo no Supabase e vincula cada um
 * ao seu profile (profiles.user_id).
 *
 * Idempotente: se o usuário já existe no Auth, apenas garante a senha
 * padrão e o vínculo com o profile. Pode rodar quantas vezes quiser.
 *
 * Uso: npx tsx scripts/create-auth-users.ts
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
  console.error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = "stoller123";

/** Email padronizado: primeironome.sobrenome@stoller.dev (sem acentos) */
const USERS: { profileId: string; fullName: string; email: string }[] = [
  { profileId: "00000000-0000-4000-8000-000000000401", fullName: "Carlos Menezes", email: "carlos.menezes@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000402", fullName: "Fernanda Oliveira", email: "fernanda.oliveira@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000403", fullName: "Ricardo Tavares", email: "ricardo.tavares@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000404", fullName: "João Pedro Almeida", email: "joao.almeida@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000405", fullName: "Marina Costa", email: "marina.costa@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000406", fullName: "Eduardo Santin", email: "eduardo.santin@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000407", fullName: "Patrícia Ramos", email: "patricia.ramos@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000408", fullName: "Bruno Cardoso", email: "bruno.cardoso@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000409", fullName: "Luciana Freitas", email: "luciana.freitas@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000410", fullName: "André Nogueira", email: "andre.nogueira@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000411", fullName: "Camila Duarte", email: "camila.duarte@stoller.dev" },
  { profileId: "00000000-0000-4000-8000-000000000412", fullName: "Rafael Lima", email: "rafael.lima@stoller.dev" },
];

async function listAllUsers() {
  const users = [];
  let page = 1;
  // Protótipo tem poucos usuários; 3 páginas de 50 é mais que suficiente.
  for (; page <= 3; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 50) break;
  }
  return users;
}

async function main() {
  const existing = await listAllUsers();
  const byEmail = new Map(existing.map((u) => [u.email?.toLowerCase(), u]));

  for (const user of USERS) {
    let userId = byEmail.get(user.email)?.id;

    if (userId) {
      // Garante a senha padrão e metadados mesmo em re-execuções
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      });
      if (error) throw error;
      console.log(`= já existia: ${user.email}`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      });
      if (error) throw error;
      userId = data.user.id;
      console.log(`+ criado: ${user.email}`);
    }

    const { error: linkError } = await admin
      .from("profiles")
      .update({ user_id: userId })
      .eq("id", user.profileId);
    if (linkError) throw linkError;
  }

  const { data: unlinked, error } = await admin
    .from("profiles")
    .select("id, full_name")
    .is("user_id", null);
  if (error) throw error;
  if (unlinked.length > 0) {
    console.warn("Profiles ainda sem user_id:", unlinked);
    process.exit(1);
  }

  console.log(`\nOK — ${USERS.length} usuários garantidos e vinculados aos profiles.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
