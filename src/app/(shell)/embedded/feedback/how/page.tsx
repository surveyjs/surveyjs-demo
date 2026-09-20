import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("embeddedFeedback");

/** How /embedded/feedback is built, from `how/embedded-feedback.md`. Inside the admin shell, unlike the example it explains. */
export default function Page() {
  return <HowPage navId="embeddedFeedback" />;
}
