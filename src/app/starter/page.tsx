import { checkoutSample, getFormNavItem, getSchemaDefinition } from "@/schemas";
import { DemoDock } from "@/components/dock/DemoDock";
import { NeutralHeader } from "@/components/hosts/NeutralHeader";
import { SurveyForm } from "@/components/SurveyForm";
import { features } from "@/features";
import { pageMetadata } from "@/lib/metadata";
import { configureHref } from "@/lib/routes";
import { loadSurveyJson } from "@/storage/survey-json";

const nav = getFormNavItem("starter");

export const metadata = pageMetadata(nav.id);

// The visitor's own definition, read on the server: an edit made on `/configure`
// is in the HTML this page sends.
export default async function StarterPage() {
  return (
    <div className="min-h-svh">
      <NeutralHeader title={nav.label} description={nav.description} width="max-w-3xl" />
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 sm:px-6">
        <SurveyForm
          schema={(await loadSurveyJson(nav.schemaId)) ?? getSchemaDefinition(nav.schemaId).json}
          schemaId={nav.schemaId}
          prefillData={checkoutSample}
        />
      </main>
      {/* "Prefill demo data" and "Save as PDF" stay in the survey's own
          navigation bar, where showing `addNavigationItem` is the point: the
          dock never repeats them. */}
      <DemoDock
        exampleId={nav.id}
        configureHref={configureHref(nav.schemaId)}
        analyticsHref={features.analyticsHref?.(nav.schemaId)}
      />
    </div>
  );
}
