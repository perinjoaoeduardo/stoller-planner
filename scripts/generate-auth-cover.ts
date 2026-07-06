/**
 * Gera o placeholder /public/auth-cover.jpg das telas de auth:
 * gradiente agro (céu azul Corteva → campo verde Stoller) com linhas
 * de plantio em perspectiva. Trocar por foto real quando houver.
 *
 * Uso: npx tsx scripts/generate-auth-cover.ts
 */
import { resolve } from "node:path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 1600;

// Linhas de plantio convergindo pro horizonte (perspectiva simples).
const rows = Array.from({ length: 14 }, (_, index) => {
  const t = index / 13;
  const yBase = 720 + t * t * 880;
  const spread = 80 + t * 640;
  return `<path d="M ${600 - spread} ${HEIGHT} Q 600 ${yBase} ${600 + spread} ${HEIGHT}"
    fill="none" stroke="#3f6d1f" stroke-opacity="${0.25 + t * 0.35}"
    stroke-width="${2 + t * 10}" />`;
}).join("\n");

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0063A7"/>
      <stop offset="0.55" stop-color="#4E97CB"/>
      <stop offset="1" stop-color="#BFDCEE"/>
    </linearGradient>
    <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#96CB40"/>
      <stop offset="0.5" stop-color="#6B9A1E"/>
      <stop offset="1" stop-color="#41660f"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.78" cy="0.32" r="0.35">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="720" fill="url(#sky)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sun)"/>
  <path d="M0 730 Q 300 690 600 715 T ${WIDTH} 705 V ${HEIGHT} H 0 Z" fill="url(#field)"/>
  ${rows}
  <ellipse cx="240" cy="240" rx="150" ry="46" fill="#ffffff" opacity="0.32"/>
  <ellipse cx="360" cy="270" rx="110" ry="34" fill="#ffffff" opacity="0.24"/>
  <ellipse cx="920" cy="150" rx="130" ry="40" fill="#ffffff" opacity="0.28"/>
</svg>
`;

async function main() {
  const output = resolve(process.cwd(), "public/auth-cover.jpg");
  await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(output);
  console.log(`Gerado: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
