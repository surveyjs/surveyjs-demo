import { ChartDemo, CHART_BRAND } from "@/components/embedded/chart/ChartDemo";
import { DEMO_SURVEYS } from "@/components/embedded/shared/demo-surveys";
import { brandBootScript } from "@/components/embedded/shared/demo-controls";
import { pageMetadata } from "@/lib/metadata";
import { loadSurveyJson } from "@/storage/survey-json";

/** Named for the demo, not for the mock brand the page wears: this is what a shared link previews. */
export const metadata = pageMetadata("embeddedChart");

/**
 * Embedded demo: an internal clinical workspace, where the survey is the app.
 */
export default async function EmbeddedChartPage() {
  // The visitor's own definition, read on the server, so the form they edited on
  // `/configure` is the one in the HTML.
  const survey = DEMO_SURVEYS.encounterNote;
  const json = (await loadSurveyJson(survey.id)) ?? survey.json;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: brandBootScript(CHART_BRAND) }} />
      <ChartDemo survey={{ ...survey, json }} />
    </>
  );
}
