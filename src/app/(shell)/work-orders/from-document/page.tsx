import { getFormNavItem, getRecordCollection, getSchemaDefinition } from "@/schemas";
import { WorkOrdersView } from "@/components/WorkOrdersView";
import { getResult, listResults } from "@/storage/survey-results";
import { loadSurveyJson } from "@/storage/survey-json";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("workOrders");
const { schemaId } = getRecordCollection("workOrders");

export const metadata = pageMetadata(nav.id);

// The import panel's own URL. A static segment, so it wins over `[id]`. The
// first record is read too: it is what Close returns to.
export default async function WorkOrdersFromDocumentPage() {
  const rows = await listResults("workOrders");
  const schema = (await loadSurveyJson(schemaId)) ?? getSchemaDefinition(schemaId).json;
  const initialRecord = rows[0] && (await getResult("workOrders", rows[0].id));

  return (
    <WorkOrdersView
      title={nav.label}
      description={nav.description}
      basePath={nav.path}
      schema={schema}
      initialRows={rows}
      initialRecord={initialRecord}
      initialImport
    />
  );
}
