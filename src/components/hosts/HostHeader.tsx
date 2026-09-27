"use client";

import type { ReactNode } from "react";
import { SignedInChip } from "@/components/embedded/shared/SignedInChip";
import type { RecordHost } from "./hosts";

/**
 * The host product's own header on a records page: its mark in the brand
 * colour, its name and one line under it, and who is signed in. The records
 * page is that product's screen, the way `/feedback` is Cadence's.
 *
 * `sticky top-0 h-14`: the records page's rail sticks at `top-14` and the form
 * column scrolls to `scroll-mt-14`, both clearing exactly this bar.
 */
export function HostHeader({
  host,
  account,
  actions,
}: {
  host: RecordHost;
  /** The active session user, or the host's `staticUser`. */
  account: Record<string, unknown>;
  /** The product's own buttons, before the account: Work orders' "Add from document". */
  actions?: ReactNode;
}) {
  const Icon = host.icon;
  const role = typeof account.role === "string" && account.role ? account.role : undefined;
  const meta = typeof account.meta === "string" ? account.meta : role && role[0].toUpperCase() + role.slice(1);

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 h-14 border-b backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[96rem] items-center gap-3 px-4 sm:px-6">
        <span
          className="demo-brand-bg text-primary-foreground grid size-8 shrink-0 place-items-center rounded-md"
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold tracking-tight">{host.name}</span>
          <span className="text-muted-foreground block truncate text-[11px]">{host.subtitle}</span>
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
          <SignedInChip account={account} meta={meta} />
        </div>
      </div>
    </header>
  );
}
