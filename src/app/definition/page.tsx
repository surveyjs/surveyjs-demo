import { Suspense } from "react";
import { getNavItem } from "@/schemas";
import { DemoDock } from "@/components/dock/DemoDock";
import { NeutralHeader } from "@/components/hosts/NeutralHeader";
import { JsonWorkbench } from "@/components/configure/JsonWorkbench";
import { pageMetadata } from "@/lib/metadata";

const nav = getNavItem("definition");

export const metadata = pageMetadata(nav.id);

/**
 * Any form in the template as JSON, with the linter under it. The same
 * workbench `/configure` renders without chrome; `?form=` picks the form, read
 * with `useSearchParams`, hence the Suspense boundary.
 */
export default function DefinitionPage() {
  return (
    // The one page here that wants the whole screen: the workbench takes what
    // the header leaves, above the room the dock needs.
    <div className="flex min-h-svh flex-col">
      <NeutralHeader title={nav.label} description={nav.description} />
      <main className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col px-4 pt-6 pb-28 sm:px-6">
        <div className="min-h-0 flex-1">
          <Suspense fallback={null}>
            <JsonWorkbench inShell />
          </Suspense>
        </div>
      </main>
      {/* No editor link: this page is the editor's view of every form. */}
      <DemoDock exampleId={nav.id} />
    </div>
  );
}
