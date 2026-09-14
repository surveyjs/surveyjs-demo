import { getFormNavItem } from "@/schemas";
import { ClaimsView } from "@/components/ClaimsView";
import { getResult, listResults } from "@/storage/survey-results";
import { pageMetadata } from "@/lib/metadata";

const nav = getFormNavItem("claims");

export const metadata = pageMetadata(nav.id);

export default async function ClaimsPage() {
  const rows = await listResults("claims");
  const initialRecord = rows[0] && (await getResult("claims", rows[0].id));

  return (
    <ClaimsView
      title={nav.label}
      description={nav.description}
      initialRows={rows}
      initialRecord={initialRecord}
    />
  );
}
