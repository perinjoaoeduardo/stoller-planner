import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PendenciasLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="gap-2">
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} className="gap-3">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
