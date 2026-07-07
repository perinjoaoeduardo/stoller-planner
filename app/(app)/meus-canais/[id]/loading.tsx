import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton espelhando a visão do canal (resumo + filtros + cards). */
export default function MeuCanalLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 w-20 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
