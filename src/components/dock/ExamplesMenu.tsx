"use client";

import { ChevronDownIcon, MenuIcon } from "lucide-react";
import { DockButton } from "./DockButton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useExamples } from "@/components/examples/ExamplesProvider";
import { findExample, menuExamples, runLink } from "@/examples/entries";
import { features } from "@/features";
import { DOCK_LABELS, NEW_TAB_MARK, USE_CASES_URL } from "@/lib/site";
import { mergeTailwindClasses } from "@/lib/utils";
import { getNavItem, type NavId } from "@/schemas/navigation";

const MENU_LINK = "group cursor-default hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring flex min-w-0 items-baseline gap-2 px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none";

function exampleGroup(id: string): string {
  switch (id) {
    case "starter": return "start";
    case "healthcare":
    case "humanResources": return "applications";
    case "definition": return "tools";
    default: return "forms";
  }
}

/**
 * The current example's name opens the way to the others, and back to the
 * site's use-cases page through the final menu item.
 *
 * One line per entry of the manifest, at most ten: the name runs the example,
 * and the problem is a plain-text description. An example in this app keeps
 * its pathname only, so the link stays on this host and in this edition; one
 * on its own host opens in a new tab with ↗.
 *
 * `modal={false}` for the reason the dock's other menus give: a modal popover
 * locks the page scroll, and the scrollbar going shifts this centred, fixed
 * toolbar sideways. Esc and a click outside close it, and focus goes back to
 * the trigger.
 */
export function ExamplesMenu({ currentId }: { currentId: NavId }) {
  const manifest = useExamples();
  const entries = menuExamples(manifest.entries);
  const currentName = findExample(manifest, currentId)?.name ?? getNavItem(currentId).label;

  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <DockButton
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 rounded-full text-[11px] font-medium tracking-wide uppercase"
          tooltip={DOCK_LABELS.switchDemo}
          aria-label={currentName}
        >
          <MenuIcon className="size-3.5" />
          <span className="truncate">{currentName}</span>
          <ChevronDownIcon className="opacity-60" />
        </DockButton>
      </PopoverTrigger>
      {/* Above the toolbar itself (z-70), which is fixed over the page. */}
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        lang="en"
        aria-label={DOCK_LABELS.moreExamples}
        className="z-[80] cursor-default max-h-(--radix-popover-content-available-height) w-[min(24rem,calc(100svw-24px))] overflow-y-auto p-0"
      >
        <div className="text-muted-foreground flex items-center justify-between gap-2 border-b px-3 py-2 text-xs font-normal">
          <span>{DOCK_LABELS.examplesTitle}</span>
          <Badge variant="secondary">{features.brand.editionLabel}</Badge>
        </div>
        <ul className="py-1">
          {entries.map((entry, index) => {
            const run = runLink(entry, features.edition);
            const current = entry.id === currentId;
            const startsGroup = index > 0 && exampleGroup(entry.id) !== exampleGroup(entries[index - 1].id);
            return (
              <li
                key={entry.id}
                data-example={entry.id}
                className={startsGroup ? "mt-1 border-t pt-1" : undefined}
              >
                <a
                  href={run.href}
                  {...(run.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  aria-label={`${entry.name}${run.external ? ` ${NEW_TAB_MARK}` : ""}`}
                  aria-current={current ? "page" : undefined}
                  className={mergeTailwindClasses(
                    MENU_LINK,
                    current && "bg-accent",
                  )}
                >
                  <strong
                    className={mergeTailwindClasses(
                      "shrink-0 font-medium whitespace-nowrap",
                      current && "text-primary",
                    )}
                  >
                    {entry.name}
                    {run.external && ` ${NEW_TAB_MARK}`}
                  </strong>
                  <span className="text-muted-foreground min-w-0 truncate text-xs">{entry.problem}</span>
                </a>
              </li>
            );
          })}
          <li className="mt-1 border-t pt-1">
            <a href={USE_CASES_URL} target="_blank" rel="noreferrer" className={MENU_LINK}>
              <strong className="font-medium">
                {DOCK_LABELS.allUseCases} {NEW_TAB_MARK}
              </strong>
            </a>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
