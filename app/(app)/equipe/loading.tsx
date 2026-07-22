import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton espelhando a Equipe atual: título + card único (a página
 *  ainda é o aviso "Em breve"; quando a tabela por RTV chegar, este
 *  skeleton cresce junto). */
export default function EquipeLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card className="gap-3">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
