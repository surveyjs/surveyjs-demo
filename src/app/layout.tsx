import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HowBuiltProvider } from "@/components/how-built/HowBuiltProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SurveyJS + Next.js — server-rendered, JSON-driven forms",
  description:
    "Complex forms defined as JSON, rendered on the server by Next.js and styled with shadcn/ui through the SurveyJS theme adapter.",
};

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
          <HowBuiltProvider>{children}</HowBuiltProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
