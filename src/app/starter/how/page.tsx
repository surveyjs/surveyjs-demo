import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("starter");

/** How /starter is built. The whole page is `how/starter.md`. */
export default function Page() {
  return <HowPage navId="starter" />;
}
