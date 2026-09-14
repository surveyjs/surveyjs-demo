import { Suspense } from "react";
import { getNavItem } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { JsonWorkbench } from "@/components/configure/JsonWorkbench";

const nav = getNavItem("definition");

/**
 * Any form in the template as JSON, with the linter under it, inside the admin
 * shell. The same workbench `/configure` renders without chrome; `?form=` picks
 * the form, read with `useSearchParams`, hence the Suspense boundary.
 */
export default function DefinitionPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={nav.label} description={nav.description} />
      <div className="min-h-0 flex-1">
        <Suspense fallback={null}>
          <JsonWorkbench inShell />
        </Suspense>
      </div>
    </div>
  );
}
