/**
 * Where the examples manifest comes from: a URL when one is configured, the
 * bundled copy otherwise, and the bundled copy whenever the URL fails.
 *
 * `NEXT_PUBLIC_EXAMPLES_MANIFEST_URL` is inlined at build time like the metadata
 * variables. The site repo will publish the manifest there; until it does, the
 * variable is unset and every page renders from `manifest.json` beside this file.
 * A menu must never be empty because another host is down, so any failure —
 * network, timeout, status, JSON, shape — logs one line and falls back.
 *
 * React-free and never imported from a `"use client"` file, like `how-content.ts`:
 * the root layout awaits it on the server and hands the result to
 * `ExamplesProvider`. `e2e/` imports it too.
 */
import { BUNDLED_EXAMPLES } from "./entries";
import { parseManifest } from "./parse";
import type { ExamplesManifest } from "./types";

/** How long a fetched manifest is reused before Next.js asks again. */
const REVALIDATE_SECONDS = 300;
const TIMEOUT_MS = 3000;

export async function loadExamples(
  url: string | undefined = process.env.NEXT_PUBLIC_EXAMPLES_MANIFEST_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<ExamplesManifest> {
  if (!url) return BUNDLED_EXAMPLES;
  try {
    const response = await fetchImpl(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseManifest(await response.json());
  } catch (failure) {
    const reason = failure instanceof Error ? failure.message : String(failure);
    console.error(`[examples] ${url} was not used, the bundled manifest was: ${reason}`);
    return BUNDLED_EXAMPLES;
  }
}
