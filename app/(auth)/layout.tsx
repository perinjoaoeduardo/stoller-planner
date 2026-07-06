import Image from "next/image";

import { BrandLogo } from "@/components/app/brand-logo";
import { ThemeToggle } from "@/components/app/theme-toggle";

/**
 * Shell das telas de auth (padrão login-03/signup-03 do shadcn):
 * formulário à esquerda, painel de marca com imagem à direita —
 * a imagem some abaixo de lg. Placeholder em /public/auth-cover.jpg
 * até termos a foto oficial.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between">
          <BrandLogo className="[&_svg]:size-7 [&>span:last-child]:text-base" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/auth-cover.jpg"
          alt="Campo de cultivo brasileiro"
          fill
          sizes="50vw"
          priority
          className="object-cover dark:brightness-[0.35] dark:saturate-50"
        />
        {/* Overlay sutil com o azul Corteva + frase de marca */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0063A7]/70 via-transparent to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <p className="text-lg font-semibold tracking-tight">
            Planejamento e execução comercial
          </p>
          <p className="text-sm text-white/80">
            Da estratégia da safra ao registro no campo, em um só lugar.
          </p>
        </div>
      </div>
    </div>
  );
}
