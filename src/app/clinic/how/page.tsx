import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("embeddedClinic");

/** How /clinic is built, from `how/clinic.md`. Beside the example it explains, with none of its host's chrome. */
export default function Page() {
  return <HowPage navId="embeddedClinic" />;
}
