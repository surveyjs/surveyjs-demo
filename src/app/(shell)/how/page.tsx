import { HowIndex } from "@/components/how-built/HowIndex";
import { howIndexMetadata } from "@/lib/metadata";

export const metadata = howIndexMetadata;

/**
 * Every example's explainer, in sidebar order. Deliberately not a sidebar row:
 * it is reached from the "How this page is built" panel's footer and from every
 * explainer, which is where somebody is when they want it.
 */
export default function Page() {
  return <HowIndex />;
}
