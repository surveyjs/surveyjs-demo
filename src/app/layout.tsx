import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StorageAccessProvider } from "@/components/StorageAccess";
import { ExamplesProvider } from "@/components/examples/ExamplesProvider";
import { loadExamples } from "@/examples/load";
import { siteMetadata } from "@/lib/metadata";
import "./globals.css";

/** The title template, base URL and indexing; each page adds its own copy. See `src/lib/metadata.ts`. */
export const metadata: Metadata = siteMetadata;

/**
 * Only the document, the theme and state every page shares live here. There is
 * no chrome at this level: every example page draws its own host's header, or
 * the neutral one, and the same dock, so each can look like it came from a
 * different company altogether.
 *
 * The examples manifest is loaded here, on the server, once per render: the
 * dock's menu and the "See next" card read it from `ExamplesProvider`, so the
 * client never fetches it. See `src/examples/load.ts`.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const examples = await loadExamples();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <StorageAccessProvider>
            <ExamplesProvider manifest={examples}>{children}</ExamplesProvider>
          </StorageAccessProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
