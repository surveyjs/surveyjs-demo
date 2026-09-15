import { getFormNavItem } from "@/schemas";
import { WorkOrdersView } from "@/components/WorkOrdersView";
import { getResult, listResults } from "@/storage/survey-results";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("workOrders");

export const metadata = pageMetadata(nav.id);

export default async function WorkOrdersPage() {
  const rows = await listResults("workOrders");
  const initialRecord = rows[0] && (await getResult("workOrders", rows[0].id));

  return (
    <WorkOrdersView
      title={nav.label}
      description={nav.description}
      initialRows={rows}
      initialRecord={initialRecord}
    />
  );
}
