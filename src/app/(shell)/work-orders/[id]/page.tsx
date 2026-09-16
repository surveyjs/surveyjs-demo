import { getFormNavItem, getRecordCollection, getSchemaDefinition } from "@/schemas";
import { WorkOrdersView } from "@/components/WorkOrdersView";
import { getResult, listResults } from "@/storage/survey-results";
import { loadSurveyJson } from "@/storage/survey-json";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("workOrders");
const { schemaId } = getRecordCollection("workOrders");

// Canonical to `/work-orders`: a record's URL is the same page.
export const metadata = pageMetadata(nav.id);

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await listResults("workOrders");
  const schema = (await loadSurveyJson(schemaId)) ?? getSchemaDefinition(schemaId).json;
  // An id this visitor does not hold (deleted, another visitor's, or a typo)
  // opens the first record, and the browser puts that record's URL in the bar.
  const initialRecord =
    (await getResult("workOrders", id)) ?? (rows[0] && (await getResult("workOrders", rows[0].id)));

  return (
    <WorkOrdersView
      title={nav.label}
      description={nav.description}
      basePath={nav.path}
      schema={schema}
      initialRows={rows}
      initialRecord={initialRecord}
    />
  );
}
