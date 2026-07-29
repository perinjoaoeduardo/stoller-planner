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

/**
 * Fotos da CAIXA DE ENTRADA — bucket separado (inbox-fotos, privado).
 * Mesmo gerador, outro destino: o envio do campo chega por fora do app
 * e fica numa fila de triagem antes de alguém revisar.
 */
const INBOX_PHOTOS: Photo[] = [
  { path: "inbox/treinamento-sorriso-a.jpg", label: "Treinamento em Sorriso", sub: "Enviado pelo WhatsApp", hue: ["#1d5c3f", "#3f8f5f"] },
  { path: "inbox/treinamento-sorriso-b.jpg", label: "Turma no treinamento", sub: "Enviado pelo WhatsApp", hue: ["#215c46", "#45906a"] },
  { path: "inbox/treinamento-sorriso-c.jpg", label: "Material de apoio", sub: "Enviado pelo WhatsApp", hue: ["#1a5240", "#3a8663"] },
  { path: "inbox/treinamento-sorriso-d.jpg", label: "Encerramento da turma", sub: "Enviado pelo WhatsApp", hue: ["#164a3a", "#357a5c"] },
  { path: "inbox/visita-dourados-a.jpg", label: "Visita em Dourados", sub: "Enviado pelo WhatsApp", hue: ["#1f4d5c", "#4a8fa2"] },
  { path: "inbox/balcao-primavera-a.jpg", label: "Balcão em Primavera", sub: "Enviado pelo WhatsApp", hue: ["#5c3a1f", "#a2764a"] },
  { path: "inbox/balcao-primavera-b.jpg", label: "Exposição de produtos", sub: "Enviado pelo WhatsApp", hue: ["#54371f", "#96703f"] },
  { path: "inbox/balcao-primavera-c.jpg", label: "Equipe do balcão", sub: "Enviado pelo WhatsApp", hue: ["#4d331f", "#8a6739"] },
  { path: "inbox/cascavel-a.jpg", label: "Ação em Cascavel", sub: "Enviado pelo WhatsApp", hue: ["#3d5a1f", "#7ba23f"] },
  { path: "inbox/terra-boa-a.jpg", label: "Campo — Terra Boa", sub: "Enviado pelo WhatsApp", hue: ["#42361f", "#8a764a"] },
  { path: "inbox/rio-verde-visita-a.jpg", label: "Rodada em Rio Verde", sub: "Enviado pelo WhatsApp", hue: ["#1f2e5c", "#4a6ba2"] },
  { path: "inbox/rio-verde-visita-b.jpg", label: "Loja de Rio Verde", sub: "Enviado pelo WhatsApp", hue: ["#233062", "#516fa8"] },
  { path: "inbox/primavera-treino-a.jpg", label: "Treino em Primavera", sub: "Enviado pelo WhatsApp", hue: ["#2e1f5c", "#6b4aa2"] },
  { path: "inbox/passo-fundo-a.jpg", label: "Dia de campo — Passo Fundo", sub: "Enviado pelo WhatsApp", hue: ["#33421f", "#6f8a4a"] },
  { path: "inbox/passo-fundo-b.jpg", label: "Talhão demonstrativo", sub: "Enviado pelo WhatsApp", hue: ["#38471f", "#77914a"] },
  { path: "inbox/passo-fundo-c.jpg", label: "Produtores no campo", sub: "Enviado pelo WhatsApp", hue: ["#2f3d1c", "#688245"] },
  { path: "inbox/passo-fundo-d.jpg", label: "Encerramento do dia", sub: "Enviado pelo WhatsApp", hue: ["#2a371a", "#5e7740"] },
  { path: "inbox/plantar-a.jpg", label: "Reunião — Plantar", sub: "Enviado pelo WhatsApp", hue: ["#5c1f33", "#a24a6b"] },
  { path: "inbox/sementes-a.jpg", label: "Sementes & Cia", sub: "Enviado pelo WhatsApp", hue: ["#1f5c55", "#4aa298"] },
  { path: "inbox/sementes-b.jpg", label: "Equipe em treinamento", sub: "Enviado pelo WhatsApp", hue: ["#1b524c", "#42918a"] },
  { path: "inbox/rondonopolis-mix-a.jpg", label: "Reunião de mix", sub: "Enviado pelo WhatsApp", hue: ["#7a2244", "#b25579"] },
  { path: "inbox/rondonopolis-mix-b.jpg", label: "Comparativo de giro", sub: "Enviado pelo WhatsApp", hue: ["#6b2a52", "#a45f8a"] },
  { path: "inbox/dourados-bio-a.jpg", label: "Dia de campo de bioestimulantes", sub: "Enviado pelo WhatsApp", hue: ["#4a5d23", "#8aa64a"] },
  { path: "inbox/ponta-grossa-a.jpg", label: "Capacitação em Ponta Grossa", sub: "Enviado pelo WhatsApp", hue: ["#1f4d5c", "#4a8fa2"] },
  { path: "inbox/ponta-grossa-b.jpg", label: "Equipe de balcão", sub: "Enviado pelo WhatsApp", hue: ["#235361", "#5195a8"] },
  { path: "inbox/ponta-grossa-c.jpg", label: "Material aplicado", sub: "Enviado pelo WhatsApp", hue: ["#1c454f", "#438494"] },
  { path: "inbox/resolvido-a.jpg", label: "Registro já resolvido", sub: "Enviado pelo WhatsApp", hue: ["#3a3a3a", "#6e6e6e"] },
  { path: "inbox/resolvido-b.jpg", label: "Registro já resolvido", sub: "Enviado pelo WhatsApp", hue: ["#343434", "#666666"] },
  { path: "inbox/resolvido-c.jpg", label: "Registro já resolvido", sub: "Enviado pelo WhatsApp", hue: ["#2f2f2f", "#5e5e5e"] },
  { path: "inbox/resolvido-d.jpg", label: "Registro já resolvido", sub: "Enviado pelo WhatsApp", hue: ["#2b2b2b", "#565656"] },
  { path: "inbox/descartado-a.jpg", label: "Registro descartado", sub: "Enviado pelo WhatsApp", hue: ["#3a3a3a", "#6e6e6e"] },
  { path: "inbox/descartado-b.jpg", label: "Registro descartado", sub: "Enviado pelo WhatsApp", hue: ["#333333", "#636363"] },
  // Fotos exclusivas dos registros do RTV da demo (migração 26): cada
  // registro precisa do SEU arquivo, porque a triagem MOVE a foto.
  { path: "inbox/rtv-treinamento-a.jpg", label: "Treinamento em Sorriso", sub: "Enviado pelo WhatsApp", hue: ["#1d5c3f", "#3f8f5f"] },
  { path: "inbox/rtv-treinamento-b.jpg", label: "Turma no treinamento", sub: "Enviado pelo WhatsApp", hue: ["#215c46", "#45906a"] },
  { path: "inbox/rtv-treinamento-c.jpg", label: "Material de apoio", sub: "Enviado pelo WhatsApp", hue: ["#1a5240", "#3a8663"] },
  { path: "inbox/rtv-passo-fundo-a.jpg", label: "Dia de campo — Passo Fundo", sub: "Enviado pelo WhatsApp", hue: ["#33421f", "#6f8a4a"] },
  { path: "inbox/rtv-passo-fundo-b.jpg", label: "Talhão demonstrativo", sub: "Enviado pelo WhatsApp", hue: ["#38471f", "#77914a"] },
  { path: "inbox/rtv-passo-fundo-c.jpg", label: "Produtores no campo", sub: "Enviado pelo WhatsApp", hue: ["#2f3d1c", "#688245"] },
  { path: "inbox/rtv-passo-fundo-d.jpg", label: "Encerramento do dia", sub: "Enviado pelo WhatsApp", hue: ["#2a371a", "#5e7740"] },
  { path: "inbox/rtv-terra-boa-a.jpg", label: "Campo — Terra Boa", sub: "Enviado pelo WhatsApp", hue: ["#42361f", "#8a764a"] },
  { path: "inbox/rtv-sementes-a.jpg", label: "Sementes & Cia", sub: "Enviado pelo WhatsApp", hue: ["#1f5c55", "#4aa298"] },
  { path: "inbox/rtv-bio-dourados-a.jpg", label: "Dia de campo em Dourados", sub: "Enviado pelo WhatsApp", hue: ["#4a5d23", "#8aa64a"] },
  { path: "inbox/rtv-bio-dourados-b.jpg", label: "Talhão demonstrativo", sub: "Enviado pelo WhatsApp", hue: ["#42541f", "#7d9945"] },
  { path: "inbox/rtv-barreiras-a.jpg", label: "Visita em Barreiras", sub: "Enviado pelo WhatsApp", hue: ["#1f4d5c", "#4a8fa2"] },
  { path: "inbox/rtv-primavera-a.jpg", label: "Treino de balcão em Primavera", sub: "Enviado pelo WhatsApp", hue: ["#5c3a1f", "#a2764a"] },
  { path: "inbox/rtv-primavera-b.jpg", label: "Exposição de produtos", sub: "Enviado pelo WhatsApp", hue: ["#54371f", "#96703f"] },
  { path: "inbox/rtv-primavera-c.jpg", label: "Equipe do balcão", sub: "Enviado pelo WhatsApp", hue: ["#4d331f", "#8a6739"] },
  { path: "inbox/rtv-lem-a.jpg", label: "Rodada de lojas em LEM", sub: "Enviado pelo WhatsApp", hue: ["#2e1f5c", "#6b4aa2"] },
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
  <text x="90" y="90" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#ffffffbb">FOTO DE DEMONSTRAÇÃO — CORTEVA PED</text>
</svg>`;
}

async function upload(photos: Photo[], bucket: string) {
  for (const photo of photos) {
    const jpeg = await sharp(Buffer.from(photoSvg(photo)))
      .jpeg({ quality: 82 })
      .toBuffer();

    const { error } = await supabase.storage
      .from(bucket)
      .upload(photo.path, jpeg, { contentType: "image/jpeg", upsert: true });

    if (error) {
      console.error("FALHA", bucket, photo.path, error.message);
      process.exitCode = 1;
    } else {
      console.log("ok", bucket, photo.path, `${(jpeg.length / 1024).toFixed(0)}kb`);
    }
  }
}

async function main() {
  await upload(PHOTOS, "activity-photos");
  await upload(INBOX_PHOTOS, "inbox-fotos");
}

main();
