"use client";

import {
  ActivityTable,
  type ActivityTableColumn,
  type ActivityTableRow,
} from "@/components/shared/activity-table";
import { useActivityDrawer } from "@/components/app/activity-drawer";
import { useWizardProvider } from "@/components/app/wizard-provider";

const COLUMNS: ActivityTableColumn[] = [
  "atividade",
  "prazo",
  "status",
  "acao",
];

/**
 * Tabela enxuta das atividades do próprio DSM na home. Clicar abre o
 * painel; "Registrar" abre o wizard de execução. Reusa a ActivityTable
 * canônica (canal na 2ª linha via showChannel).
 */
export function DsmMyActivities({
  activities,
}: {
  activities: ActivityTableRow[];
}) {
  const { openActivity } = useActivityDrawer();
  const { openWizard } = useWizardProvider();

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
      <ActivityTable
        activities={activities}
        columns={COLUMNS}
        onRowClick={(activity) => openActivity(activity.id)}
        rowAction="registrar"
        onRegister={(activity) =>
          openWizard({ mode: "registrar", activityId: activity.id })
        }
        deadlineFormat="date"
        showChannel
      />
    </div>
  );
}
