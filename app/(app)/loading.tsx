import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="gap-2">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-3">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
