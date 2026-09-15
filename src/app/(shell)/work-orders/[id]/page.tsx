import { getFormNavItem } from "@/schemas";
import { WorkOrdersView } from "@/components/WorkOrdersView";
import { getResult, listResults } from "@/storage/survey-results";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("workOrders");

// Canonical to `/work-orders`: a record's URL is the same page.
export const metadata = pageMetadata(nav.id);

export async function generateStaticParams() {
  const rows = await listResults("workOrders");
  return rows.map((row) => ({ id: row.id }));
}

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await listResults("workOrders");
  // An id the server does not hold (a record created in a browser, or a typo)
  // opens the first record, and the browser puts that record's URL in the bar.
  const initialRecord =
    (await getResult("workOrders", id)) ?? (rows[0] && (await getResult("workOrders", rows[0].id)));

  return (
    <WorkOrdersView
      title={nav.label}
      description={nav.description}
      basePath={nav.path}
      initialRows={rows}
      initialRecord={initialRecord}
    />
  );
}
