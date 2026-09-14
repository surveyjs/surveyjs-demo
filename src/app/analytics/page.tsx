import { Suspense } from "react";
import type { Metadata } from "next";
import { SurveyAnalytics } from "@/components/analytics/SurveyAnalytics";
import { getFormEntry } from "@/components/configure/forms";
import { formToolMetadata } from "@/lib/metadata";
import { features } from "@/features";

/**
 * Titled after the page the chosen form lives on, "<page title> — Results".
 * Reading `searchParams` renders this route per request; `htmlLimitedBots` in
 * `next.config.mjs` keeps its metadata in the `<head>` all the same.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ form?: string | string[] }>;
}): Promise<Metadata> {
  const { form } = await searchParams;
  const entry = getFormEntry(typeof form === "string" ? form : undefined);
  return formToolMetadata(entry.href, "Results", features.analyticsHref?.(entry.id) ?? "/analytics");
}

/**
 * The dashboard page. `?form=` picks the form, read with `useSearchParams` —
 * hence the Suspense boundary.
 */
export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <SurveyAnalytics />
    </Suspense>
  );
}
