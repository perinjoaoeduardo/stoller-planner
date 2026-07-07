import { cn } from "@/lib/utils";

/**
 * Padroniza o cabeçalho e o container de conteúdo de todas as páginas.
 */
export function PageShell({
  title,
  description,
  descriptionClassName,
  breadcrumb,
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  /** Sobrescreve o estilo padrão da descrição (ex: cor de alerta). */
  descriptionClassName?: string;
  /** Breadcrumb opcional, exibido acima do título (páginas profundas). */
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-1 flex-col gap-8 p-5 md:p-8", className)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {breadcrumb}
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p
              className={
                descriptionClassName ?? "text-sm text-muted-foreground"
              }
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children}
    </div>
  );
}
