import { cn } from "@/lib/utils";

/**
 * Padroniza o cabeçalho e o container de conteúdo de todas as páginas.
 *
 * Hierarquia visual gravada aqui — não deve ser sobrescrita nas paginas:
 * breadcrumb → mb-4 (16px) → título → mt-2 (8px) → descrição → gap-8
 * (32px) → conteúdo. As páginas passam apenas o conteúdo dos slots.
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
  description?: React.ReactNode;
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
        <div className="min-w-0 flex-1">
          {breadcrumb ? <div className="mb-4">{breadcrumb}</div> : null}
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p
              className={
                descriptionClassName ?? "mt-2 text-sm text-muted-foreground"
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
