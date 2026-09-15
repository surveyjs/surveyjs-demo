import { getFormNavItem } from "@/schemas";
import { RecordsView } from "@/components/records/RecordsView";
import { getResult, listResults } from "@/storage/survey-results";
import { listSessionUsers } from "@/storage/session";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("leads");

export const metadata = pageMetadata(nav.id);

export default async function LeadsPage() {
  const rows = await listResults("leads");
  const initialRecord = rows[0] && (await getResult("leads", rows[0].id));
  // In your app: the session's one user.
  const users = await listSessionUsers("leads");

  return (
    <RecordsView
      collectionId="leads"
      title={nav.label}
      description={nav.description}
      initialRows={rows}
      initialRecord={initialRecord}
      users={users}
      // Four matrices need the full width; see `layout` on RecordsView.
      layout="stacked"
    />
  );
}
