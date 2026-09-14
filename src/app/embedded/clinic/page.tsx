import { RidgelineDemo, RIDGELINE_BRAND } from "@/components/embedded/clinic/RidgelineDemo";
import { DEMO_SURVEYS } from "@/components/embedded/shared/demo-surveys";
import { brandBootScript } from "@/components/embedded/shared/demo-controls";
import { pageMetadata } from "@/lib/metadata";

/** Named for the demo, not for the mock brand the page wears: this is what a shared link previews. */
export const metadata = pageMetadata("embeddedClinic");

/**
 * Embedded demo: a US primary-care site whose public request form is rendered
 * from the signed-in patient's portal record.
 */
export default function EmbeddedClinicPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: brandBootScript(RIDGELINE_BRAND) }} />
      <RidgelineDemo survey={DEMO_SURVEYS.clinicVisit} />
    </>
  );
}
