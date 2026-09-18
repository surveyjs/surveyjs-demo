"use client";

import { Button } from "@/components/ui/button";
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
  signInLabel = "Sign in",
  className,
}: {
  account: Record<string, unknown>;
  /** The one line worth showing under the name — plan, company, MRN. */
  meta?: string;
  /**
   * What the fallback button says. It is the host site’s own word, so a site
   * that speaks another language passes its own; the default is what every
   * demo but the clinic uses.
   */
  signInLabel?: string;
  className?: string;
}) {
  const name = accountName(account);

  if (!name) {
    return (
      <Button variant="outline" size="sm" className={className}>
        {signInLabel}
      </Button>
    );
  }

  return (
    <span
      className={mergeTailwindClasses(
        "bg-background/60 flex items-center gap-2 rounded-full border py-1 pr-3 pl-1",
        className,
      )}
    >
      <span
        className="demo-brand-soft grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
        aria-hidden
      >
        {accountInitials(account)}
      </span>
      <span className="hidden leading-tight sm:block">
        <span className="block text-xs font-medium">{name}</span>
        {meta && <span className="text-muted-foreground block text-[11px]">{meta}</span>}
      </span>
    </span>
  );
}
