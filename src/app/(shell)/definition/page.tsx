import { Suspense } from "react";
import { getNavItem } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { JsonWorkbench } from "@/components/configure/JsonWorkbench";
import { pageMetadata } from "@/lib/metadata";

const nav = getNavItem("definition");

export const metadata = pageMetadata(nav.id);

/**
 * Any form in the template as JSON, with the linter under it, inside the admin
 * shell. The same workbench `/configure` renders without chrome; `?form=` picks
 * the form, read with `useSearchParams`, hence the Suspense boundary.
 */
export default function DefinitionPage() {
  return (
    // The one page here that wants the whole screen. The shell scrolls as a
    // single page, so there is no `h-full` to inherit: 100svh less the top bar
    // (3.5rem) and `main`'s `lg:py-8` (4rem) is the room it has.
    <div className="flex min-h-[calc(100svh-7.5rem)] flex-col">
      <PageHeader title={nav.label} description={nav.description} />
      <div className="min-h-0 flex-1">
        <Suspense fallback={null}>
          <JsonWorkbench inShell />
        </Suspense>
      </div>
    </div>
  );
}
