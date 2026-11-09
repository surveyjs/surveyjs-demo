"use client";

import { Fragment } from "react";
import type { LucideIcon } from "lucide-react";
import { EllipsisIcon } from "lucide-react";
import { DockButton } from "./DockButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DOCK_LABELS, NEW_TAB_MARK } from "@/lib/site";
import { mergeTailwindClasses } from "@/lib/utils";

/**
 * One control the bar gives up on a narrow screen. `below` is the breakpoint
 * under which it leaves the bar for the "⋯" menu: `xl` for page links and
 * exports, `lg` for form controls, and `sm` for the editor.
 */
export interface OverflowItem {
  readonly key: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly below: "xl" | "lg" | "sm";
  /** A link, or a button when `onSelect` is set instead. */
  readonly href?: string;
  readonly newTab?: boolean;
  readonly onSelect?: () => void;
  /** The same guard the bar's control honours. */
  readonly disabled?: boolean;
  /** Add a divider after this item, optionally only below a narrower breakpoint. */
  readonly separatorAfter?: boolean | "lg" | "sm";
  readonly checked?: boolean;
}

/** In the bar: shown from the breakpoint up, gone below it (the menu has it there). */
export const SHOWN_FROM: Record<OverflowItem["below"], string> = {
  xl: "hidden xl:inline-flex",
  lg: "hidden lg:inline-flex",
  sm: "hidden sm:inline-flex",
};

/** In the menu: only below the breakpoint, where the bar no longer shows it. */
const MENU_ONLY_BELOW: Record<OverflowItem["below"], string> = {
  xl: "",
  lg: "lg:hidden",
  sm: "sm:hidden",
};

/**
 * "⋯": what the dock has no room for, in the order the bar would show it.
 *
 * Breakpoints, not measurement, so the HTML the server sends is already the
 * final layout and nothing jumps once JavaScript runs. It renders only when it
 * holds something, and only at widths where it does: a page whose collapsing
 * controls are all `sm` ones gets the trigger below `sm` alone.
 */
export function DockOverflow({ items }: { items: readonly OverflowItem[] }) {
  if (items.length === 0) return null;
  const hiddenFrom = items.some((item) => item.below === "xl")
    ? "xl:hidden"
    : items.some((item) => item.below === "lg") ? "lg:hidden" : "sm:hidden";

  return (
    // `modal={false}`: a modal menu locks the page scroll, and the scrollbar
    // going shifts this centred, fixed toolbar sideways.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <DockButton
          variant="ghost"
          size="icon-sm"
          className={mergeTailwindClasses("shrink-0 rounded-full", hiddenFrom)}
          aria-label={DOCK_LABELS.overflow}
          tooltip={DOCK_LABELS.overflow}
        >
          <EllipsisIcon />
        </DockButton>
      </DropdownMenuTrigger>
      {/* Above the toolbar itself (z-70), which is fixed over the page. */}
      <DropdownMenuContent side="top" align="end" collisionPadding={12} lang="en" className="z-[80] w-60 max-w-[calc(100svw-24px)] cursor-default">
        {items.map((item, index) => {
          const Icon = item.icon;
          const visibilityClassName = MENU_ONLY_BELOW[item.below];
          const className = mergeTailwindClasses("cursor-default", visibilityClassName);
          const separatorClassName = mergeTailwindClasses(
            "h-0 border-t border-border bg-transparent",
            visibilityClassName,
            typeof item.separatorAfter === "string" && MENU_ONLY_BELOW[item.separatorAfter],
          );
          return (
            <Fragment key={item.key}>
              {item.checked !== undefined ? (
                <DropdownMenuCheckboxItem
                  indicatorSide="right"
                  className={className}
                  checked={item.checked}
                  disabled={item.disabled}
                  onCheckedChange={item.onSelect}
                >
                  <Icon className="text-muted-foreground" />
                  {item.label}
                </DropdownMenuCheckboxItem>
              ) : item.onSelect ? (
                <DropdownMenuItem
                  className={className}
                  disabled={item.disabled}
                  onSelect={item.onSelect}
                >
                  <Icon />
                  {item.label}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className={className} disabled={item.disabled} asChild>
                  <a href={item.href} {...(item.newTab ? { target: "_blank", rel: "noreferrer" } : {})}>
                    <Icon />
                    {item.label}
                    {item.newTab && ` ${NEW_TAB_MARK}`}
                  </a>
                </DropdownMenuItem>
              )}
              {item.separatorAfter && index < items.length - 1 && (
                <DropdownMenuSeparator className={separatorClassName} />
              )}
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
