/**
 * What the dock's menu, the root index and the "See next" card show of the
 * manifest, and where each entry links. Pure functions over a manifest, safe in
 * a client bundle and in `e2e/`: no fetch, no React.
 */
import type { Edition } from "@/features";
import { USE_CASES_URL } from "@/lib/site";
import bundled from "./manifest.json";
import { parseManifest } from "./parse";
import type { ExampleEntry, ExamplesManifest } from "./types";

/** The copy in this repository, checked like a remote one. The file to hand to the site repo. */
export const BUNDLED_EXAMPLES: ExamplesManifest = parseManifest(bundled);

/** The menu holds one line per entry, so it stops here however long the manifest grows. */
export const MENU_LIMIT = 10;

/** `NEXT_PUBLIC_SHOW_UNREADY`, inlined at build time: `"true"` shows entries not marked `ready`. */
export const SHOW_UNREADY = process.env.NEXT_PUBLIC_SHOW_UNREADY === "true";

/** Every entry the root index lists: ready ones, or all of them with `showUnready`. */
export function visibleExamples(
  entries: readonly ExampleEntry[],
  showUnready: boolean = SHOW_UNREADY,
): ExampleEntry[] {
  return entries.filter((entry) => entry.ready || showUnready);
}

/** The dock's menu: the visible entries that do not opt out with `inMenu: false`, at most ten. */
export function menuExamples(
  entries: readonly ExampleEntry[],
  showUnready: boolean = SHOW_UNREADY,
): ExampleEntry[] {
  return visibleExamples(entries, showUnready)
    .filter((entry) => entry.inMenu !== false)
    .slice(0, MENU_LIMIT);
}

export interface ExampleLink {
  readonly href: string;
  /** Another host: a new tab and ↗. */
  readonly external: boolean;
}

/**
 * Where an entry runs. An example in this app keeps only the pathname of its
 * edition's `runUrl`, so a link stays on whatever host is serving the page —
 * localhost, a preview deployment or production — and in this edition.
 */
export function runLink(entry: ExampleEntry, edition: Edition): ExampleLink {
  if (entry.runUrl) return { href: new URL(entry.runUrl[edition]).pathname, external: false };
  return { href: entry.url ?? "/", external: true };
}

/** The entry's section on the use-cases page, or `undefined` while it has none. */
export function problemHref(entry: ExampleEntry): string | undefined {
  const anchor = entry.useCaseAnchor?.trim();
  return anchor ? `${USE_CASES_URL}#${anchor}` : undefined;
}

export function findExample(manifest: ExamplesManifest, id: string): ExampleEntry | undefined {
  return manifest.entries.find((entry) => entry.id === id);
}
