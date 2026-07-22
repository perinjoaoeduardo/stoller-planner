"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        // Ícone no quadradinho tintado — o mesmo padrão de IconBox dos
        // cards do app (Constituição, item 4).
        success: (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-bg">
            <CircleCheckIcon className="size-4 text-success" />
          </span>
        ),
        info: (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-brand/10">
            <InfoIcon className="size-4 text-accent-brand" />
          </span>
        ),
        warning: (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-bg">
            <TriangleAlertIcon className="size-4 text-warning-fg" />
          </span>
        ),
        error: (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <OctagonXIcon className="size-4 text-destructive" />
          </span>
        ),
        loading: (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          </span>
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "calc(var(--radius) * 1.4)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // Toast do design system: card popover com borda, radius-xl e
          // shadow-elevated (sai do plano) — semântica só no ícone, o
          // texto continua neutro (Sonner discreto, AGENTS.md).
          toast:
            "cn-toast items-center! gap-3! border-border! bg-popover! p-4! text-popover-foreground! shadow-elevated!",
          // O slot do ícone precisa acomodar o quadradinho de 32px.
          icon: "m-0! size-8! shrink-0!",
          title: "text-sm! font-semibold! leading-snug!",
          description: "mt-0.5! text-xs! text-muted-foreground!",
          // CTA do toast (ex.: "Ver atividade"): anatomia de Button do
          // shadcn no azul de ação Corteva.
          actionButton:
            "h-8! shrink-0! rounded-md! bg-accent-brand! px-3! text-xs! font-medium! text-white! transition-opacity! duration-base! hover:opacity-90!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
