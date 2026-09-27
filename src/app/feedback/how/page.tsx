import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("embeddedFeedback");

/** How /feedback is built, from `how/feedback.md`. Beside the example it explains, with none of its host's chrome. */
export default function Page() {
  return <HowPage navId="embeddedFeedback" />;
}
