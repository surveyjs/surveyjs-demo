import { getFormNavItem } from "@/schemas";
import { RecordsView } from "@/components/records/RecordsView";
import { getResult, listResults } from "@/storage/survey-results";
import { listSessionUsers } from "@/storage/session";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("leads");

// Canonical to `/leads`: a record's URL is the same page.
export const metadata = pageMetadata(nav.id);

export async function generateStaticParams() {
  const rows = await listResults("leads");
  return rows.map((row) => ({ id: row.id }));
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await listResults("leads");
  // An id the server does not hold (a record created in a browser, or a typo)
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
      initialRows={rows}
      initialRecord={initialRecord}
      users={users}
    />
  );
}
