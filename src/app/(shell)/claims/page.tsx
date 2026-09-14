import { getFormNavItem, getSchemaDefinition } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { ClaimsView } from "@/components/ClaimsView";
import { listResults } from "@/storage/survey-results";
import { features } from "@/features";

const nav = getFormNavItem("claims");

export default async function ClaimsPage() {
  const records = await listResults();

  return (
    <div>
      <PageHeader
        title={nav.label}
        description={nav.description}
        analyticsHref={features.analyticsHref?.(nav.schemaId)}
      />
      <ClaimsView
        schema={getSchemaDefinition(nav.schemaId).json}
        schemaId={nav.schemaId}
        initialRecords={records}
      />
    </div>
  );
}
