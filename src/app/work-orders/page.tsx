import { getFormNavItem, getRecordCollection, getSchemaDefinition } from "@/schemas";
import { WorkOrdersView } from "@/components/WorkOrdersView";
import { getResult, listResults } from "@/storage/survey-results";
import { loadSurveyJson } from "@/storage/survey-json";
import { brandBootScript, HOST_BRANDS } from "@/components/embedded/shared/demo-controls";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("workOrders");
const { schemaId } = getRecordCollection("workOrders");

export const metadata = pageMetadata(nav.id);

// The first record, in place: the URL stays `/work-orders`.
export default async function WorkOrdersPage() {
  const rows = await listResults("workOrders");
  const schema = (await loadSurveyJson(schemaId)) ?? getSchemaDefinition(schemaId).json;
  const initialRecord = rows[0] && (await getResult("workOrders", rows[0].id));

  return (
    <>
      {/* The first frame is already in Tallis's palette. */}
      <script dangerouslySetInnerHTML={{ __html: brandBootScript(HOST_BRANDS.workOrders) }} />
      <WorkOrdersView
        title={nav.label}
        basePath={nav.path}
        schema={schema}
        initialRows={rows}
        initialRecord={initialRecord}
      />
    </>
  );
}
