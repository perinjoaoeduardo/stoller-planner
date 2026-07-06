/**
 * Cria o bucket público "avatars" para as fotos de perfil.
 * Idempotente: se o bucket já existe, apenas confirma.
 *
 * Uso: npx tsx scripts/create-avatars-bucket.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (buckets.some((bucket) => bucket.name === "avatars")) {
    console.log("Bucket 'avatars' já existe — nada a fazer.");
    return;
  }

  const { error } = await supabase.storage.createBucket("avatars", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) throw error;
  console.log("Bucket 'avatars' criado (público, 5MB, jpeg/png/webp).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
