import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton espelhando o passo 1 do wizard de registro. */
export default function RegistrarLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <div className="h-1 w-full bg-muted" />
      <div className="flex flex-col gap-4 px-4 py-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <Skeleton className="mt-auto h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
