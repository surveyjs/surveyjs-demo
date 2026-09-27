"use client";

import { createContext, useContext, type ReactNode } from "react";
import { BUNDLED_EXAMPLES } from "@/examples/entries";
import type { ExamplesManifest } from "@/examples/types";

const ExamplesContext = createContext<ExamplesManifest>(BUNDLED_EXAMPLES);

/**
 * The examples manifest, for the dock's menu and the "See next" card.
 *
 * The root layout loads it on the server (`loadExamples`, which may fetch) and
 * passes the result in, so the client never fetches it and the menu in the
 * server HTML is the menu the browser shows.
 */
export function ExamplesProvider({
  manifest,
  children,
}: {
  manifest: ExamplesManifest;
  children: ReactNode;
}) {
  return <ExamplesContext.Provider value={manifest}>{children}</ExamplesContext.Provider>;
}

export function useExamples(): ExamplesManifest {
  return useContext(ExamplesContext);
}
