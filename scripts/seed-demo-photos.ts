/**
 * Gera imagens placeholder (JPEG via sharp) para as fotos do seed e
 * sobe para o bucket activity-photos com a service role.
 *
 * Rodar: pnpm tsx scripts/seed-demo-photos.ts
 * Requer .env.local com NEXT_PUBLIC_SUPABASE_URL e
 * SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// ─── env ─────────────────────────────────────────────────────────────
const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => [
      line.slice(0, line.indexOf("=")).trim(),
      line.slice(line.indexOf("=") + 1).trim(),
    ])
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── fotos do seed (path → rótulo + paleta) ──────────────────────────
type Photo = { path: string; label: string; sub: string; hue: [string, string] };

const PHOTOS: Photo[] = [
  { path: "seed/treinamento-sorriso-01.jpg", label: "Treinamento de fungicidas", sub: "Filial Sorriso — set/2025", hue: ["#1d5c3f", "#3f8f5f"] },
  { path: "seed/dia-campo-sorriso-01.jpg", label: "Dia de campo — talhão demonstrativo", sub: "Sorriso - MT — nov/2025", hue: ["#3d5a1f", "#7ba23f"] },
  { path: "seed/dia-campo-sorriso-02.jpg", label: "Produtores no dia de campo", sub: "Sorriso - MT — nov/2025", hue: ["#4a5d23", "#8aa64a"] },
  { path: "seed/visita-tecnica-rio-verde-01.jpg", label: "Visita técnica conjunta", sub: "Rio Verde - GO — fev/2026", hue: ["#1f4d5c", "#4a8fa2"] },
  { path: "seed/reuniao-santa-luzia-01.jpg", label: "Reunião — Fazenda Santa Luzia", sub: "Rondonópolis - MT — fev/2026", hue: ["#5c3a1f", "#a2764a"] },
  { path: "seed/campanha-fungicidas-01.jpg", label: "Largada da campanha de fungicidas", sub: "Filial Sorriso — jan/2026", hue: ["#5c1f33", "#a24a6b"] },
  { path: "seed/treinamento-rio-verde-01.jpg", label: "Treinamento de biológicos — turma 2", sub: "Rio Verde - GO — mar/2026", hue: ["#2e1f5c", "#6b4aa2"] },
  { path: "seed/analise-mix-rondonopolis-01.jpg", label: "Workshop de análise de mix", sub: "Rondonópolis - MT — fev/2026", hue: ["#1f2e5c", "#4a6ba2"] },
  { path: "seed/convencao-fidelidade-01.jpg", label: "Lançamento do programa de fidelidade", sub: "Convenção AgroVale — out/2025", hue: ["#7a2244", "#b25579"] },
  { path: "seed/convencao-fidelidade-02.jpg", label: "Equipe comercial na convenção", sub: "Convenção AgroVale — out/2025", hue: ["#6b2a52", "#a45f8a"] },
  { path: "seed/fidelidade-revisao-01.jpg", label: "Revisão trimestral do programa", sub: "Rio Verde - GO — jun/2026", hue: ["#1f5c55", "#4aa298"] },
  // Fotos originais dos outros canais (rows já existem no banco)
  { path: "seed/assembleia-passo-fundo-01.jpg", label: "Palestra na assembleia de cooperados", sub: "Passo Fundo - RS — out/2025", hue: ["#33421f", "#6f8a4a"] },
  { path: "seed/treinamento-balsas-01.jpg", label: "Treinamento de biológicos", sub: "Balsas - MA — out/2025", hue: ["#42361f", "#8a764a"] },
];

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function photoSvg(photo: Photo) {
  const [dark, light] = photo.hue;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <circle cx="1050" cy="120" r="220" fill="#ffffff" opacity="0.08"/>
  <circle cx="120" cy="700" r="260" fill="#000000" opacity="0.10"/>
  <rect x="60" y="560" width="1080" height="180" rx="20" fill="#000000" opacity="0.35"/>
  <text x="90" y="638" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${escapeXml(photo.label)}</text>
  <text x="90" y="696" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#ffffffcc">${escapeXml(photo.sub)}</text>
  <text x="90" y="90" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#ffffffbb">FOTO DE DEMONSTRAÇÃO — STOLLER PLANNER</text>
</svg>`;
}

async function main() {
  for (const photo of PHOTOS) {
    const jpeg = await sharp(Buffer.from(photoSvg(photo)))
      .jpeg({ quality: 82 })
      .toBuffer();

    const { error } = await supabase.storage
      .from("activity-photos")
      .upload(photo.path, jpeg, { contentType: "image/jpeg", upsert: true });

    if (error) {
      console.error("FALHA", photo.path, error.message);
      process.exitCode = 1;
    } else {
      console.log("ok", photo.path, `${(jpeg.length / 1024).toFixed(0)}kb`);
    }
  }
}

main();
