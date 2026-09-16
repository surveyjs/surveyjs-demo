import { getFormNavItem, getRecordCollection, getSchemaDefinition } from "@/schemas";
import { RecordsView } from "@/components/records/RecordsView";
import { getResult, listResults } from "@/storage/survey-results";
import { loadSurveyJson } from "@/storage/survey-json";
import { listSessionUsers } from "@/storage/session";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("leads");
const { schemaId } = getRecordCollection("leads");

export const metadata = pageMetadata(nav.id);

// The first record, in place: the URL stays `/leads`.
export default async function LeadsPage() {
  const rows = await listResults("leads");
  const schema = (await loadSurveyJson(schemaId)) ?? getSchemaDefinition(schemaId).json;
  const initialRecord = rows[0] && (await getResult("leads", rows[0].id));
  // In your app: the session's one user.
  const users = await listSessionUsers("leads");

  return (
    <RecordsView
      collectionId="leads"
      title={nav.label}
      description={nav.description}
      basePath={nav.path}
      schema={schema}
      initialRows={rows}
      initialRecord={initialRecord}
      users={users}
    />
  );
}
