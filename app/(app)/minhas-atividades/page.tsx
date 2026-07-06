import { PageShell } from "@/components/app/page-shell";
import { getCurrentProfile } from "@/lib/auth/scope";
import { getFieldActivities } from "@/lib/db/execution";

import { MyActivitiesList } from "./my-activities-list";

export const dynamic = "force-dynamic";

/**
 * "Minhas Atividades" do RTV/RDC — mobile-first: lista vertical de
 * cards agrupados por urgência, sem DataTable. No desktop fica em
 * largura de leitura; este perfil não precisa de tabela.
 */
export default async function MinhasAtividadesPage() {
  const profile = await getCurrentProfile();
  const { activities } = await getFieldActivities(profile);

  return (
    <PageShell
      title="Minhas Atividades"
      description="Suas atividades em campo, das mais urgentes às concluídas."
      className="mx-auto w-full max-w-2xl"
    >
      <MyActivitiesList activities={activities} />
    </PageShell>
  );
}
