import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton espelhando Minhas Atividades: filtros + grupos de cards. */
export default function MinhasAtividadesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-20 rounded-full" />
        <Skeleton className="h-11 flex-1 rounded-md" />
      </div>
      <Skeleton className="h-12 w-full rounded-md" />
      {Array.from({ length: 2 }).map((_, group) => (
        <div key={group} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
