import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton com a SILHUETA do card (foto quadrada à esquerda, texto à
 * direita), não spinner. O usuário já sabe o formato do que vem: o
 * esqueleto mantém o layout no lugar e a página não pula quando carrega.
 */
export default function CaixaDeEntradaLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-[30rem] max-w-full" />
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-32" />
      </div>

      {Array.from({ length: 2 }).map((_, grupo) => (
        <div key={grupo} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 3 }).map((_, card) => (
            <div
              key={card}
              className="flex gap-4 rounded-xl border bg-card p-3"
            >
              <Skeleton className="size-28 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2 py-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64 max-w-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
