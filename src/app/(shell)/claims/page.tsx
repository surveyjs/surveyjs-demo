import { getNavItem, getSchemaDefinition, medicalFormSample } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { SurveyForm } from "@/components/SurveyForm";
import { features } from "@/features";

const nav = getNavItem("claims");

export default function ClaimsPage() {
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
        completedMessage="Thank you. Your intake form has been submitted."
        prefillData={medicalFormSample}
      />
    </div>
  );
}
