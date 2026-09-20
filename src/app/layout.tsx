import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StorageAccessProvider } from "@/components/StorageAccess";
import { siteMetadata } from "@/lib/metadata";
import "./globals.css";

/** The title template, base URL and indexing; each page adds its own copy. See `src/lib/metadata.ts`. */
export const metadata: Metadata = siteMetadata;

/**
 * Only the document, the theme and state every page shares live here. The admin
 * chrome belongs to the `(shell)` route group, so `/embedded` can render a page
 * that looks like it came from a different company altogether.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <StorageAccessProvider>
            {children}
          </StorageAccessProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
