import { ArrowRightIcon, ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { features } from "@/features";
import { opensInNewTab } from "@/schemas";
import { HOW_BUILT_TEXT } from "@/lib/how-built";
import { listHowContent } from "@/lib/how-content";
import { howHref, otherEditionHref } from "@/lib/routes";

/**
 * Every example in the template, with one sentence each and the two links worth
 * having: the explainer, and the example itself.
 *
 * `listHowContent` reads **both** editions' rows, so an example this edition
 * does not ship is listed as one the other edition has and linked to that host,
 * rather than silently missing. It gets no sidebar row of its own: this page is
 * reached from the top bar's link on every example, and from every explainer.
 *
 * The one sentence on each card is that file's `summary` front matter — the same
 * string the explainer opens with and `howMetadata` describes the page by.
 */
export function HowIndex() {
  const { baseUrl } = features.brand.otherEdition;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">How it&apos;s built</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          One page per example: what goes into the form, what its definition does with it, what
          comes back out, and every file behind it.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {listHowContent().map(({ nav, summary }) => {
          const elsewhere = nav.edition !== undefined && nav.edition !== features.edition;
          const explainer = elsewhere
            ? otherEditionHref(baseUrl, howHref(nav.path))
            : howHref(nav.path);

          return (
            <li key={nav.id}>
              <Card data-example={nav.id} className="h-full gap-2 px-6">
                <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
                  {nav.label}
                  {elsewhere && (
                    <Badge variant="outline" className="text-muted-foreground font-normal">
                      {HOW_BUILT_TEXT.otherEdition}
                    </Badge>
                  )}
                </h2>
                <p className="text-muted-foreground flex-1 text-sm leading-relaxed">{summary}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <a
                    href={explainer}
                    className="text-primary flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                  >
                    {HOW_BUILT_TEXT.readHow}
                    <ArrowRightIcon className="size-3.5" />
                  </a>
                  {!elsewhere && (
                    <a
                      href={nav.path}
                      {...(opensInNewTab(nav) ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="text-muted-foreground flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      {HOW_BUILT_TEXT.openExample}
                      {opensInNewTab(nav) && <ExternalLinkIcon className="size-3.5" />}
                    </a>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
