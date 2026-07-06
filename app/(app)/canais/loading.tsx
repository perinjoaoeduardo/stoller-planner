import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton do grid de cards de canal, espelhando o layout final. */
export default function CanaisLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <header className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="gap-4">
            <CardHeader className="gap-2">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
