import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton da tabela global de atividades. */
export default function AtividadesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <header className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-96" />
      </header>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="space-y-2 rounded-3xl border p-4">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
