import { getFormNavItem } from "@/schemas";
import { WorkOrdersView } from "@/components/WorkOrdersView";
import { getResult, listResults } from "@/storage/survey-results";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("workOrders");

export const metadata = pageMetadata(nav.id);

// The import panel's own URL. A static segment, so it wins over `[id]`. The
// first record is read too: it is what Close returns to.
export default async function WorkOrdersFromDocumentPage() {
  const rows = await listResults("workOrders");
  const initialRecord = rows[0] && (await getResult("workOrders", rows[0].id));

  return (
    <WorkOrdersView
      title={nav.label}
      description={nav.description}
      basePath={nav.path}
      initialRows={rows}
      initialRecord={initialRecord}
      initialImport
    />
  );
}
