import { RidgelineDemo, RIDGELINE_BRAND } from "@/components/embedded/clinic/RidgelineDemo";
import { DEMO_SURVEYS } from "@/components/embedded/shared/demo-surveys";
import { brandBootScript } from "@/components/embedded/shared/demo-controls";
import { pageMetadata } from "@/lib/metadata";
import { loadSurveyJson } from "@/storage/survey-json";

/** Named for the demo, not for the mock brand the page wears: this is what a shared link previews. */
export const metadata = pageMetadata("embeddedClinic");

/**
 * Embedded demo: a US primary-care site whose public request form is rendered
 * from the signed-in patient's portal record.
 */
export default async function EmbeddedClinicPage() {
  // The visitor's own definition, read on the server, so the form they edited on
  // `/configure` is the one in the HTML.
  const survey = DEMO_SURVEYS.clinicVisit;
  const json = (await loadSurveyJson(survey.id)) ?? survey.json;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: brandBootScript(RIDGELINE_BRAND) }} />
      <RidgelineDemo survey={{ ...survey, json }} />
    </>
  );
}
