import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  let supabaseStatus = "desconectado";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    supabaseStatus = error ? `erro: ${error.message}` : "conectado";
  } catch {
    supabaseStatus = "erro de conexão";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight">
            Stoller Planner
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Planejamento e execução comercial
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Next.js 15</Badge>
            <Badge variant="outline">Tailwind v4</Badge>
            <Badge variant="outline">shadcn/ui</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Supabase:</span>
            <Badge
              variant={supabaseStatus === "conectado" ? "secondary" : "destructive"}
            >
              {supabaseStatus}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Setup OK</p>
        </CardContent>
      </Card>
    </div>
  );
}
