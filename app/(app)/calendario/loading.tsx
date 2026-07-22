import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton espelhando o calendário: toolbar + grade de 5 semanas. */
export default function CalendarioLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Card className="gap-3">
        <CardHeader className="flex-row items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, week) => (
            <div key={week} className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, day) => (
                <Skeleton key={day} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
