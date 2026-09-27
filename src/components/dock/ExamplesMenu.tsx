"use client";

import { ChevronUpIcon, LayersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useExamples } from "@/components/examples/ExamplesProvider";
import { menuExamples, runLink, problemHref } from "@/examples/entries";
import { features } from "@/features";
import { DEMO_NAME, DOCK_LABELS, NEW_TAB_MARK, USE_CASES_URL } from "@/lib/site";
import { mergeTailwindClasses } from "@/lib/utils";

/**
 * "More examples": the way from one example to the others, and back to the
 * site's use-cases page, which is where visitors arrive from.
 *
 * One line per entry of the manifest, at most ten: the name runs the example,
 * and the problem, when the use-cases page has a section for it, opens that
 * section in a new tab. An example in this app keeps its pathname only, so the
 * link stays on this host and in this edition; one on its own host opens in a
 * new tab with ↗.
 *
 * `modal={false}` for the reason the dock's other menus give: a modal popover
 * locks the page scroll, and the scrollbar going shifts this centred, fixed
 * toolbar sideways. Esc and a click outside close it, and focus goes back to
 * the trigger.
 */
export function ExamplesMenu({ currentId }: { currentId: string }) {
  const manifest = useExamples();
  const entries = menuExamples(manifest.entries);

  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 rounded-full text-[11px] font-medium tracking-wide uppercase"
          aria-label={DOCK_LABELS.moreExamples}
        >
          <LayersIcon className="size-3.5" />
          <span className="hidden whitespace-nowrap sm:inline">{DOCK_LABELS.moreExamples}</span>
          <ChevronUpIcon className="opacity-60" />
        </Button>
      </PopoverTrigger>
      {/* Above the toolbar itself (z-70), which is fixed over the page. */}
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        lang="en"
        aria-label={DOCK_LABELS.moreExamples}
        className="z-[80] w-[min(24rem,calc(100svw-2rem))] p-0"
      >
        <p className="text-muted-foreground border-b px-3 py-2 text-xs font-medium">
          {DEMO_NAME} · {features.brand.editionLabel}
        </p>
        <ul className="py-1">
          {entries.map((entry) => {
            const run = runLink(entry, features.edition);
            const useCase = problemHref(entry);
            const current = entry.id === currentId;
            return (
              <li
                key={entry.id}
                data-example={entry.id}
                className={mergeTailwindClasses(
                  "flex min-w-0 items-baseline gap-2 px-3 py-1.5 text-sm",
                  current && "bg-accent",
                )}
              >
                <a
                  href={run.href}
                  {...(run.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  aria-current={current ? "page" : undefined}
                  className={mergeTailwindClasses(
                    "hover:text-primary shrink-0 font-medium whitespace-nowrap underline-offset-4 hover:underline",
                    current && "text-primary",
                  )}
                >
                  {entry.name}
                  {run.external && ` ${NEW_TAB_MARK}`}
                </a>
                {useCase ? (
                  <a
                    href={useCase}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground min-w-0 truncate text-xs underline-offset-4 hover:underline"
                  >
                    {entry.problem} {NEW_TAB_MARK}
                  </a>
                ) : (
                  <span className="text-muted-foreground min-w-0 truncate text-xs">{entry.problem}</span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="border-t px-3 py-2 text-xs">
          <a
            href={USE_CASES_URL}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {DOCK_LABELS.allUseCases} {NEW_TAB_MARK}
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
