import { ExamplesIndex } from "@/components/examples/ExamplesIndex";
import { loadExamples } from "@/examples/load";
import { rootMetadata } from "@/lib/metadata";

/** Its own copy, and `noindex`: this is the team's index, not a landing page. */
export const metadata = rootMetadata;

/**
 * Every example in the manifest, from the same `loadExamples` the root layout
 * calls — the bundled copy, or the published one when a URL is configured.
 */
export default async function Home() {
  return <ExamplesIndex manifest={await loadExamples()} />;
}
