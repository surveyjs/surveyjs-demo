import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NeutralHeader } from "@/components/hosts/NeutralHeader";
import { cardLink, runLink, visibleExamples } from "@/examples/entries";
import type { ExampleEntry, ExamplesManifest } from "@/examples/types";
import { features } from "@/features";
import { DOCK_LABELS, NEW_TAB_MARK, USE_CASES_URL } from "@/lib/site";

const CARD_ORDER = [
  "leads", "workOrders", "embeddedFeedback", "embeddedClinic",
  "embeddedChart", "healthcare", "humanResources",
];

const SECTIONS = [
  {
    id: "forms",
    title: "Forms in your app",
    description: "Explore everyday workflows with forms embedded in your product.",
  },
  {
    id: "applications",
    title: "Complete applications",
    description: "See how forms fit into healthcare and HR applications.",
  },
] as const;

function sectionFor(entry: ExampleEntry): (typeof SECTIONS)[number]["id"] {
  switch (entry.id) {
    case "healthcare":
    case "humanResources": return "applications";
    default: return "forms";
  }
}

function ExampleCard({ entry }: { entry: ExampleEntry }) {
  const run = runLink(entry, features.edition);
  const extra = cardLink(entry);

  return (
    <Card
      data-example={entry.id}
      className="h-full gap-6 px-6"
    >
      <div className="flex-1 space-y-1">
        <h3 className="text-base font-semibold">{entry.name}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{entry.problem}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" asChild>
          <a
            href={run.href}
            {...(run.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            Open
          </a>
        </Button>
        {extra && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={extra.href}
              {...(extra.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {extra.label}
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * `/`: every example in the manifest, for the team and for developers. Visitors
 * arrive at an example from the site's use-cases page and move between them
 * with the dock, so this page is not indexed and not designed as a landing page.
 *
 * Ready entries (or every entry with `NEXT_PUBLIC_SHOW_UNREADY`) without a
 * menu cap. Starter and Definition & checks stay outside this catalog. A card's
 * second link is the entry's `link`, rendered only when one is set.
 */
export function ExamplesIndex({ manifest }: { manifest: ExamplesManifest }) {
  // New manifest entries stay visible after the curated examples in their section.
  const rank = (id: string) => {
    const index = CARD_ORDER.indexOf(id);
    return index === -1 ? CARD_ORDER.length : index;
  };
  const entries = visibleExamples(manifest.entries)
    .filter((entry) => entry.id !== "starter" && entry.id !== "definition")
    .sort((a, b) => rank(a.id) - rank(b.id));

  return (
    <div className="min-h-svh">
      <NeutralHeader
        width="max-w-5xl"
        actions={
          <a
            href={USE_CASES_URL}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0 text-sm underline-offset-4 hover:underline"
          >
            {DOCK_LABELS.allUseCases} {NEW_TAB_MARK}
          </a>
        }
      />
      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 lg:pt-8 lg:pb-24">
        <div className="space-y-10">
          {SECTIONS.map((section) => {
            const sectionEntries = entries.filter((entry) => sectionFor(entry) === section.id);
            if (!sectionEntries.length) return null;

            return (
              <section key={section.id} aria-labelledby={`examples-${section.id}`}>
                <div className="mb-6 space-y-1">
                  <h2 id={`examples-${section.id}`} className="text-lg font-semibold">{section.title}</h2>
                  {"description" in section && (
                    <p className="text-muted-foreground text-sm">{section.description}</p>
                  )}
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {sectionEntries.map((entry) => (
                    <li key={entry.id}>
                      <ExampleCard entry={entry} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
