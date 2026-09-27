import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("leads");

/** How /leads is built. The whole page is `how/leads.md`. */
export default function Page() {
  return <HowPage navId="leads" />;
}
