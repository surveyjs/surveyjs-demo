import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("definition");

/** How /definition is built. The whole page is `how/definition.md`. */
export default function Page() {
  return <HowPage navId="definition" />;
}
