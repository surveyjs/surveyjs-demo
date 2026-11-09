"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DemoPlaceholder } from "./DemoPlaceholder";
import { accountInitials, accountName } from "./demo-accounts";
import { mergeTailwindClasses } from "@/lib/utils";

/**
 * The "signed in as" corner every real product has, in the host site's header.
 *
 * It exists so the personalisation is visible before the form is: the page and
 * the survey are reading the same object, and when the toolbar switches user both
 * change together. With nothing on file it falls back to a sign-in button, which
 * is what a first-time visitor would actually see.
 */
export function SignedInChip({
  account,
  meta,
  details,
  signInLabel = "Sign in",
  signInMessage,
  className,
}: {
  account: Record<string, unknown>;
  /** The one line worth showing under the name — plan, company, MRN. */
  meta?: string;
  /** Additional account information available on demand. */
  details?: string;
  /**
   * What the fallback button says. It is the host site’s own word, so a site
   * that speaks another language passes its own; the default is what every
   * demo but the clinic uses.
   */
  signInLabel?: string;
  signInMessage?: string;
  className?: string;
}) {
  const name = accountName(account);

  if (!name) {
    return (
      <DemoPlaceholder message={signInMessage}>
        <Button variant="outline" size="sm" className={className}>
          {signInLabel}
        </Button>
      </DemoPlaceholder>
    );
  }

  const chipClassName = "bg-background/60 flex items-center gap-2 rounded-full border p-1 sm:pr-3";
  const identity = (
    <>
      <span
        className="demo-brand-soft grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
        aria-hidden
      >
        {accountInitials(account)}
      </span>
      <span className={mergeTailwindClasses("hidden leading-tight sm:block", details && "min-w-0")}>
        <span className={mergeTailwindClasses("block text-xs font-medium", details && "truncate")}>{name}</span>
        {meta && <span className="text-muted-foreground block text-[11px]">{meta}</span>}
      </span>
    </>
  );

  if (details) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={name}
            className={mergeTailwindClasses(
              chipClassName,
              "hover:bg-accent focus-visible:ring-ring/50 min-w-0 gap-1.5 pr-2 text-left focus-visible:ring-2 focus-visible:outline-none",
              className,
            )}
          >
            {identity}
            <ChevronDownIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={name}
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="w-64 max-w-(--radix-popover-content-available-width) px-3 py-2 text-xs"
        >
          <p className="font-medium">{name}</p>
          <p className="text-muted-foreground mt-1">{details}</p>
        </PopoverContent>
      </Popover>
    );
  }

  return <span className={mergeTailwindClasses(chipClassName, className)}>{identity}</span>;
}
