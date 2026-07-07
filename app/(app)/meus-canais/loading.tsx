import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton espelhando a lista de canais de Meus Canais. */
export default function MeusCanaisLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
