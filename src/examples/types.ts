/**
 * The examples manifest: every example the demo links to, one entry each.
 *
 * The same file serves the "More examples" menu in the dock, the root index and
 * the "See next" card, and the site repo will publish it so the use-cases page
 * reads the same list. No React: Playwright imports this from `e2e/`.
 */
import type { Edition } from "@/features";

export interface ExampleEntry {
  /** Equals the page's `NavId` when the example is a route here: that is how the dock finds the current entry. */
  readonly id: string;
  readonly name: string;
  /** One line, the problem the example answers. It links the use-cases page when `useCaseAnchor` is set. */
  readonly problem: string;
  /** An example in this app, on each edition's host. Exactly one of `runUrl` and `url` is set. */
  readonly runUrl?: Readonly<Record<Edition, string>>;
  /** An example on a host of its own, opened in a new tab. */
  readonly url?: string;
  /** Its section on https://surveyjs.io/use-cases, named like its route (`/work-orders` → `work-orders`). Empty leaves the problem unlinked. */
  readonly useCaseAnchor?: string;
  /** False hides it everywhere unless `NEXT_PUBLIC_SHOW_UNREADY` is `"true"`. */
  readonly ready: boolean;
  /** At most two other ids, shown by "See next" once this example is completed. */
  readonly related: readonly string[];
  /** False keeps it off the dock's menu; it is still on the root index. Defaults to true. */
  readonly inMenu?: boolean;
  /**
   * A second link on this entry's card on the root index, beside Open.
   * Unset: the card shows only Open. The manifest writes `null` for that,
   * because JSON has no `undefined`. An `https://` href opens in a new tab;
   * a path stays on this host, in this tab.
   */
  readonly link?: { readonly label: string; readonly href: string };
}

export interface ExamplesManifest {
  readonly version: 1;
  readonly entries: readonly ExampleEntry[];
}
