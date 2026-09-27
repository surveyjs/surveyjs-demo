import { CadenceDemo } from "@/components/embedded/feedback/CadenceDemo";
import { DEMO_SURVEYS } from "@/components/embedded/shared/demo-surveys";
import { brandBootScript, HOST_BRANDS } from "@/components/embedded/shared/demo-controls";
import { pageMetadata } from "@/lib/metadata";
import { loadSurveyJson } from "@/storage/survey-json";

/** Named for the demo, not for the mock brand the page wears: this is what a shared link previews. */
export const metadata = pageMetadata("embeddedFeedback");

/**
 * Embedded demo: a satisfaction survey in a product site's hero, addressed to
 * whoever is signed in.
 */
export default async function EmbeddedFeedbackPage() {
  // The visitor's own definition, read on the server, so the form they edited on
  // `/configure` is the one in the HTML.
  const survey = DEMO_SURVEYS.satisfaction;
  const json = (await loadSurveyJson(survey.id)) ?? survey.json;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: brandBootScript(HOST_BRANDS.embeddedFeedback) }} />
      <CadenceDemo survey={{ ...survey, json }} />
    </>
  );
}
