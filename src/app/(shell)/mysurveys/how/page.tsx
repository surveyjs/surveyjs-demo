import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { navPages } from "@/schemas";
import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

// The row is `edition: "full"`, so an edition without it has no MySurveys page
// and no explainer for one either: this route answers 404 exactly where
// `mysurveys/page.tsx` does. The module is still shared, and this edition's
// `/how` index lists the example as one the other edition has.
const nav = navPages.find((item) => item.id === "mySurveys");

export const metadata: Metadata = nav ? howMetadata(nav.id) : {};

/** How /mysurveys is built. The whole page is `how/mysurveys.md`. */
export default function Page() {
  if (!nav) notFound();
  return <HowPage navId={nav.id} />;
}
