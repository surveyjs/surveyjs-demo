"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BlocksIcon, FileCode2Icon, LayersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHowBuilt } from "@/components/how-built/HowBuiltProvider";
import { features } from "@/features";
import { otherEditionHref, pageSourcePath } from "@/lib/routes";
import { DEMO_NAME, PAGE_ACTIONS, SITE_LINKS } from "@/lib/site";
import { mergeTailwindClasses } from "@/lib/utils";
import { ThemeSwitcher } from "./ThemeSwitcher";

/**
 * The mark, the demo's name and the edition pill.
 *
 * `compact` is the top bar's form: below `sm` the name is left to screen readers,
 * so the pill and the page actions keep their room. The mobile sheet shows it in
 * full.
 */
export function TopBarBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
        aria-hidden
      >
        <LayersIcon className="size-4" />
      </span>
      {/* Two spans: `not-sr-only` resets overflow and white-space, so the
          truncation lives on the inner one. */}
      <span className={compact ? "sr-only sm:not-sr-only sm:min-w-0" : "min-w-0"}>
        <span className="block truncate text-sm font-semibold">{DEMO_NAME}</span>
      </span>
      <Badge variant="secondary" className="shrink-0">
        {features.brand.editionLabel}
      </Badge>
    </div>
  );
}

/** The same page on the other edition's host, in this tab: the routes are identical. */
function EditionSwitch({ className }: { className?: string }) {
  const pathname = usePathname();
  const { label, baseUrl } = features.brand.otherEdition;

  return (
    <a
      href={otherEditionHref(baseUrl, pathname)}
      className={mergeTailwindClasses(
        "hover:text-primary shrink-0 font-medium whitespace-nowrap underline-offset-4 hover:underline",
        className,
      )}
    >
      {label} →
    </a>
  );
}

function SiteLink({ label, href, className }: { label: string; href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={mergeTailwindClasses(
        "text-muted-foreground hover:text-foreground shrink-0 whitespace-nowrap",
        className,
      )}
    >
      {label} ↗
    </a>
  );
}

/**
 * The edition switch and the site links, stacked — for the mobile sheet, where
 * the top bar has no room for them.
 */
export function TopBarLinks() {
  return (
    <div className="flex flex-col items-start gap-2.5 text-sm">
      <EditionSwitch />
      {SITE_LINKS.map((link) => (
        <SiteLink key={link.id} label={link.label} href={link.href} />
      ))}
    </div>
  );
}

/**
 * The admin top bar: who this is, which edition, the site around it, and what
 * can be done with the page itself. Nothing per-form lives here — those actions
 * belong to the page header, the survey's own navigation and the demo dock.
 *
 * Every edition-specific value comes from `@/features`, so this file is the same
 * in every edition. `data-edition` on the header lets an edition shift the layout
 * with Tailwind `data-[edition=full]:` variants instead of editing the markup.
 *
 * Widths: below `sm`, the mark, the pill and the actions as icons; from `sm`, the
 * name (truncating) and the switch; from `lg`, the site links (the menu trigger
 * goes, as the sidebar appears); from `xl`, the action labels. Only the name
 * shrinks, and an icon-only action keeps its label as `aria-label` and `title`.
 */
export function TopBar({ mobileNav }: { mobileNav: ReactNode }) {
  const pathname = usePathname();
  const { open, toggle } = useHowBuilt();
  const sourcePath = pageSourcePath(pathname);

  return (
    <header
      data-edition={features.edition}
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur sm:gap-3"
    >
      {mobileNav}

      <TopBarBrand compact />

      <EditionSwitch className="hidden text-xs sm:inline" />

      <nav aria-label="SurveyJS site" className="hidden shrink-0 items-center gap-3 text-xs lg:flex">
        {SITE_LINKS.map((link) => (
          <SiteLink key={link.id} label={link.label} href={link.href} />
        ))}
      </nav>

      {/* Page-level actions only. */}
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {sourcePath && (
          <Button variant="ghost" size="sm" asChild>
            <a
              href={`${features.brand.sourceUrl}/blob/main/${sourcePath}`}
              target="_blank"
              rel="noreferrer"
              aria-label={PAGE_ACTIONS.source}
              title={PAGE_ACTIONS.source}
            >
              <FileCode2Icon />
              <span className="hidden xl:inline">{PAGE_ACTIONS.source}</span>
            </a>
          </Button>
        )}
        {/* Toggles shared state only; the panel it opens is a separate task
            (`HowBuiltPanel`). */}
        <Button
          variant="ghost"
          size="sm"
          className="aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          aria-pressed={open}
          aria-label={PAGE_ACTIONS.howBuilt}
          title={PAGE_ACTIONS.howBuilt}
          onClick={toggle}
        >
          <BlocksIcon />
          <span className="hidden xl:inline">{PAGE_ACTIONS.howBuilt}</span>
        </Button>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
