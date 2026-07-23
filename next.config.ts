import type { NextConfig } from "next";

// Hostname das fotos derivado do próprio env do Supabase — um projeto
// novo (outro Supabase) funciona só trocando o .env.local, sem tocar
// aqui. Sem env, o next/image não libera host remoto (falha explícita
// no dev, não silenciosa).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.241"],
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
