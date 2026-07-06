import {
  CircleAlert,
  CircleCheckBig,
  ClipboardList,
  Store,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ActivitiesStatusChart } from "@/components/app/activities-status-chart";
import { PageShell } from "@/components/app/page-shell";
import { StatusBadge } from "@/components/app/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardData } from "@/lib/db/dashboard";

export const dynamic = "force-dynamic";

function formatDueDate(date: string | null) {
  if (!date) return "—";
  return format(parseISO(date), "dd MMM yyyy", { locale: ptBR });
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const metrics = [
    {
      label: "Total de atividades",
      value: data.totalActivities.toString(),
      hint: "Safra 2025/26, todos os canais",
      icon: ClipboardList,
    },
    {
      label: "Concluídas",
      value: `${data.completedPercent}%`,
      hint: `${data.completedCount} de ${data.totalActivities} atividades`,
      icon: CircleCheckBig,
    },
    {
      label: "Atrasadas",
      value: data.overdueCount.toString(),
      hint: "Exigem ação imediata",
      icon: CircleAlert,
    },
    {
      label: "Canais ativos",
      value: data.activeChannels.toString(),
      hint: "Com plano ativo na safra",
      icon: Store,
    },
  ];

  return (
    <PageShell
      title="Início"
      description="Visão geral da execução comercial na safra 2025/26."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="gap-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardDescription>{metric.label}</CardDescription>
              <metric.icon className="size-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metric.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Atividades por status</CardTitle>
            <CardDescription>
              Distribuição das atividades da safra em cada status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivitiesStatusChart data={data.byStatus} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Próximas do vencimento</CardTitle>
            <CardDescription>
              As 10 atividades pendentes com prazo mais próximo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.upcoming.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="max-w-64 truncate font-medium">
                      {activity.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.channel}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.responsible}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDueDate(activity.dueDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={activity.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
