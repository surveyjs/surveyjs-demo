"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExamples } from "@/components/examples/ExamplesProvider";
import { findExample, problemHref, runLink, visibleExamples } from "@/examples/entries";
import type { ExampleEntry } from "@/examples/types";
import { features } from "@/features";
import { DEMO_COMPLETED } from "@/lib/demo-events";
import { DOCK_LABELS, NEW_TAB_MARK } from "@/lib/site";

/**
 * "See next": the examples this one's manifest entry names in `related`, shown
 * above the dock once somebody has finished the form — the moment a visitor
 * has seen what this page had to show.
 *
 * It listens for `demo:completed` (`src/lib/demo-events.ts`) and shows once per
 * page view: a ref, so a second completion on the same page — another record
 * saved, the form filled again — does not bring it back after Dismiss. With
 * nothing to show (no entry, no related entry the menu would list) it never
 * renders. It lives beside the dock and never in a definition's `completedHtml`:
 * the form is the host's, the card is the reviewer's.
 *
 * `role="region"`, not `status`: it is a place to go next, not an announcement.
 */
export function SeeNextCard({ currentId }: { currentId: string }) {
  const manifest = useExamples();
  const related = useMemo<ExampleEntry[]>(() => {
    const ids = findExample(manifest, currentId)?.related ?? [];
    return visibleExamples(
      ids.map((id) => findExample(manifest, id)).filter((entry): entry is ExampleEntry => Boolean(entry)),
    );
  }, [manifest, currentId]);

  const shown = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (related.length === 0) return;
    const onCompleted = () => {
      if (shown.current) return;
      shown.current = true;
      setOpen(true);
    };
    window.addEventListener(DEMO_COMPLETED, onCompleted);
    return () => window.removeEventListener(DEMO_COMPLETED, onCompleted);
  }, [related.length]);

  if (!open || related.length === 0) return null;

  return (
    <section
      role="region"
      aria-label={DOCK_LABELS.seeNext}
      lang="en"
      className="bg-background/95 pointer-events-auto w-[min(24rem,100%)] rounded-xl border p-3 shadow-lg backdrop-blur"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {DOCK_LABELS.seeNext}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="-my-1 h-7 gap-1 px-2 text-xs"
          onClick={() => setOpen(false)}
        >
          <XIcon className="size-3.5" />
          Dismiss
        </Button>
      </div>
      <ul className="mt-1 space-y-1.5">
        {related.map((entry) => {
          const run = runLink(entry, features.edition);
          const useCase = problemHref(entry);
          return (
            <li key={entry.id} data-example={entry.id} className="text-sm leading-snug">
              <a
                href={run.href}
                {...(run.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="hover:text-primary font-medium underline-offset-4 hover:underline"
              >
                {entry.name}
                {run.external && ` ${NEW_TAB_MARK}`}
              </a>{" "}
              {useCase ? (
                <a
                  href={useCase}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                >
                  {entry.problem} {NEW_TAB_MARK}
                </a>
              ) : (
                <span className="text-muted-foreground text-xs">{entry.problem}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
