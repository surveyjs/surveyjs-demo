import { CadenceDemo, CADENCE_BRAND } from "@/components/embedded/feedback/CadenceDemo";
import { DEMO_SURVEYS } from "@/components/embedded/shared/demo-surveys";
import { brandBootScript } from "@/components/embedded/shared/demo-controls";
import { pageMetadata } from "@/lib/metadata";

/** Named for the demo, not for the mock brand the page wears: this is what a shared link previews. */
export const metadata = pageMetadata("embeddedFeedback");

/**
 * Embedded demo: a satisfaction survey in a product site's hero, addressed to
 * whoever is signed in.
 */
export default function EmbeddedFeedbackPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: brandBootScript(CADENCE_BRAND) }} />
      <CadenceDemo survey={DEMO_SURVEYS.satisfaction} />
    </>
  );
}
