import { ArrowRightIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NeutralHeader } from "@/components/hosts/NeutralHeader";
import { runLink, problemHref, visibleExamples } from "@/examples/entries";
import type { ExamplesManifest } from "@/examples/types";
import { features } from "@/features";
import { HOW_BUILT_TEXT } from "@/lib/how-built";
import { howHref } from "@/lib/routes";
import { DOCK_LABELS, NEW_TAB_MARK, USE_CASES_URL } from "@/lib/site";
import { navPages } from "@/schemas/navigation";

const LINK = "flex items-center gap-1 underline-offset-4 hover:underline";

/**
 * `/`: every example in the manifest, for the team and for developers. Visitors
 * arrive at an example from the site's use-cases page and move between them
 * with the dock, so this page is not indexed and not designed as a landing page.
 *
 * The same visibility rule as the dock's menu — `ready`, or every entry with
 * `NEXT_PUBLIC_SHOW_UNREADY` — but no cap and no `inMenu` filter: Starter and
 * Definition & checks are listed here and only here.
 */
export function ExamplesIndex({ manifest }: { manifest: ExamplesManifest }) {
  const entries = visibleExamples(manifest.entries);

  return (
    <div className="min-h-svh">
      <NeutralHeader
        title={`Every example · ${features.brand.editionLabel}`}
        description="What each example shows, how it is built, and where it runs. Visitors reach them from the use-cases page."
        width="max-w-5xl"
      />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <ul className="grid gap-4 sm:grid-cols-2">
          {entries.map((entry) => {
            const run = runLink(entry, features.edition);
            const page = navPages.find((item) => item.id === entry.id);
            const useCase = problemHref(entry);
            return (
              <li key={entry.id}>
                <Card data-example={entry.id} className="h-full gap-2 px-6">
                  <h2 className="text-base font-semibold">{entry.name}</h2>
                  <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                    {useCase ? (
                      <a href={useCase} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                        {entry.problem} {NEW_TAB_MARK}
                      </a>
                    ) : (
                      entry.problem
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <a
                      href={run.href}
                      {...(run.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className={`text-primary font-medium ${LINK}`}
                    >
                      Open
                      {run.external ? ` ${NEW_TAB_MARK}` : <ArrowRightIcon className="size-3.5" />}
                    </a>
                    {page && (
                      <a href={howHref(page.path)} className={`text-muted-foreground ${LINK}`}>
                        {HOW_BUILT_TEXT.howBuilt}
                      </a>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground mt-8 text-sm">
          <a href={USE_CASES_URL} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
            {DOCK_LABELS.allUseCases} {NEW_TAB_MARK}
          </a>
        </p>
      </main>
    </div>
  );
}
