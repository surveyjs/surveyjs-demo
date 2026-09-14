import { checkoutSample, getFormNavItem, getSchemaDefinition } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { SurveyForm } from "@/components/SurveyForm";
import { features } from "@/features";

const nav = getFormNavItem("starter");

export default function StarterPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={nav.label}
        description={nav.description}
        configureHref={`/configure?form=${nav.schemaId}`}
        analyticsHref={features.analyticsHref?.(nav.schemaId)}
      />
      <SurveyForm
        schema={getSchemaDefinition(nav.schemaId).json}
        schemaId={nav.schemaId}
        prefillData={checkoutSample}
      />
    </div>
  );
}
