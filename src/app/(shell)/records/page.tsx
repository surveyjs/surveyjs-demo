import { getNavItem, getSchemaDefinition } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { RecordsView } from "@/components/RecordsView";
import { listResults } from "@/storage/survey-results";
import { features } from "@/features";

const nav = getNavItem("records");

export default async function RecordsPage() {
  const records = await listResults();

  return (
    <div>
      <PageHeader
        title={nav.label}
        description={nav.description}
        analyticsHref={features.analyticsHref?.(nav.schemaId)}
      />
      <RecordsView
        schema={getSchemaDefinition(nav.schemaId).json}
        schemaId={nav.schemaId}
        initialRecords={records}
      />
    </div>
  );
}
