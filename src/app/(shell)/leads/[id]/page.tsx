import { getFormNavItem, getRecordCollection, getSchemaDefinition } from "@/schemas";
import { RecordsView } from "@/components/records/RecordsView";
import { getResult, listResults } from "@/storage/survey-results";
import { loadSurveyJson } from "@/storage/survey-json";
import { listSessionUsers } from "@/storage/session";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("leads");
const { schemaId } = getRecordCollection("leads");

// Canonical to `/leads`: a record's URL is the same page.
export const metadata = pageMetadata(nav.id);

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await listResults("leads");
  const schema = (await loadSurveyJson(schemaId)) ?? getSchemaDefinition(schemaId).json;
  // An id this visitor does not hold (deleted, another visitor's, or a typo)
  // opens the first record, and the browser puts that record's URL in the bar.
  const initialRecord =
    (await getResult("leads", id)) ?? (rows[0] && (await getResult("leads", rows[0].id)));
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
