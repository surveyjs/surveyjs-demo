import { ChartDemo, CHART_BRAND } from "@/components/embedded/chart/ChartDemo";
import { DEMO_SURVEYS } from "@/components/embedded/shared/demo-surveys";
import { brandBootScript } from "@/components/embedded/shared/demo-controls";
import { pageMetadata } from "@/lib/metadata";

/** Named for the demo, not for the mock brand the page wears: this is what a shared link previews. */
export const metadata = pageMetadata("embeddedChart");

/**
 * Embedded demo: an internal clinical workspace, where the survey is the app.
 */
export default function EmbeddedChartPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: brandBootScript(CHART_BRAND) }} />
      <ChartDemo survey={DEMO_SURVEYS.encounterNote} />
    </>
  );
}
