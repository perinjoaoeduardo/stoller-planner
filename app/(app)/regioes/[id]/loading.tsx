import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RegiaoLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="gap-1.5 py-4">
            <CardHeader className="px-4">
              <Skeleton className="h-3.5 w-28" />
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="gap-4 xl:col-span-2">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
