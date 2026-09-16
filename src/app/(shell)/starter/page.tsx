import { checkoutSample, getFormNavItem, getSchemaDefinition } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { SurveyForm } from "@/components/SurveyForm";
import { features } from "@/features";
import { pageMetadata } from "@/lib/metadata";
import { loadSurveyJson } from "@/storage/survey-json";

const nav = getFormNavItem("starter");

export const metadata = pageMetadata(nav.id);

// The visitor's own definition, read on the server: an edit made on `/configure`
// is in the HTML this page sends.
export default async function StarterPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={nav.label}
        description={nav.description}
        configureHref={`/configure?form=${nav.schemaId}`}
        analyticsHref={features.analyticsHref?.(nav.schemaId)}
      />
      <SurveyForm
        schema={(await loadSurveyJson(nav.schemaId)) ?? getSchemaDefinition(nav.schemaId).json}
        schemaId={nav.schemaId}
        prefillData={checkoutSample}
      />
    </div>
  );
}
