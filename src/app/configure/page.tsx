import { Suspense } from "react";
import type { Metadata } from "next";
import { SurveyDesigner } from "@/components/configure/SurveyDesigner";
import { getFormEntry } from "@/components/configure/forms";
import { configureHref } from "@/lib/routes";
import { formToolMetadata } from "@/lib/metadata";

/**
 * Titled after the page the chosen form lives on, "<page title> — Customize".
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
  return formToolMetadata(entry.href, "Customize", configureHref(entry.id));
}

/**
 * The one designer in the template, for every form in it.
 *
 * `?form=` picks which one, so a link to a particular form is shareable; the
 * designer reads it with `useSearchParams`, hence the Suspense boundary.
 */
export default function ConfigurePage() {
  return (
    <Suspense fallback={null}>
      <SurveyDesigner />
    </Suspense>
  );
}
