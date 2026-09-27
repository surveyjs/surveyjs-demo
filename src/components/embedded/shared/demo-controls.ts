import type { SurveyData, SurveyJSON } from "@/schemas";

/**
 * The few things the embedded demos share, kept out of the components so the
 * orchestrator and the toolbar agree on one list.
 *
 * The toolbar used to carry placements, a palette and a definition switcher. It
 * doesn't any more: each demo is one site, one survey, one brand colour, sitting
 * inline in the page the way a real embed does. What's left is the part reviewers
 * are meant to play with — the JSON, and the user the JSON is rendered for.
 */

/** One survey a demo drops into its host site. */
export interface DemoSurvey {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly json: SurveyJSON;
  /** Answers behind the toolbar's Prefill button. */
  readonly prefill: SurveyData;
}

export interface DemoBrand {
  readonly id: string;
  readonly label: string;
  /** `null` restores the template's own neutral shadcn palette. */
  readonly primary: string | null;
  readonly primaryForeground?: string;
}

/**
 * One hue per demo, so three tabs open side by side never look like the same
 * site twice. The survey has no palette of its own to fight, so it re-skins with
 * whichever host it lands in.
 */
export const BRANDS: readonly DemoBrand[] = [
  { id: "neutral", label: "Neutral", primary: null },
  { id: "indigo", label: "Indigo", primary: "oklch(0.52 0.21 275)" },
  { id: "violet", label: "Violet", primary: "oklch(0.56 0.24 302)" },
  { id: "emerald", label: "Emerald", primary: "oklch(0.55 0.14 163)" },
  {
    id: "amber",
    label: "Amber",
    primary: "oklch(0.75 0.16 66)",
    primaryForeground: "oklch(0.22 0.03 66)",
  },
  { id: "rose", label: "Rose", primary: "oklch(0.59 0.21 16)" },
];

export const DEFAULT_BRAND_ID = "indigo";

/**
 * The palette each host site wears, by the page's `NavId`.
 *
 * Kept here rather than beside each host component because the route files
 * read it on the server for `brandBootScript`: a value exported from a
 * `"use client"` module reaches a server component as a client reference, not
 * as the string, and the boot script came out empty.
 */
export const HOST_BRANDS = {
  embeddedFeedback: "indigo",
  embeddedChart: "violet",
  embeddedClinic: "emerald",
  leads: "rose",
  workOrders: "amber",
} as const;

export function getBrand(brandId: string): DemoBrand {
  return BRANDS.find((brand) => brand.id === brandId) ?? BRANDS[0];
}

const BRAND_ATTRIBUTE = "data-demo-brand";
const BRAND_VAR = "--demo-brand";
const BRAND_FOREGROUND_VAR = "--demo-brand-foreground";

/**
 * Writes the brand hue onto `<html>`.
 *
 * Two inline custom properties plus one attribute; the attribute is what lets
 * `globals.css` route `--primary`, `--primary-foreground` and `--ring` at the
 * brand — which is why the form matches the site without a line of bespoke CSS.
 */
export function applyBrand(brand: DemoBrand): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!brand.primary) {
    root.removeAttribute(BRAND_ATTRIBUTE);
    root.style.removeProperty(BRAND_VAR);
    root.style.removeProperty(BRAND_FOREGROUND_VAR);
    return;
  }

  root.setAttribute(BRAND_ATTRIBUTE, brand.id);
  root.style.setProperty(BRAND_VAR, brand.primary);
  root.style.setProperty(
    BRAND_FOREGROUND_VAR,
    brand.primaryForeground ?? "oklch(0.99 0 0)",
  );
}

/**
 * The same write, as a string the page runs while the HTML is still parsing.
 *
 * Without it the first painted frame would carry the template's neutral palette
 * and flip to the brand a frame later — the one flash a demo cannot afford.
 */
export function brandBootScript(brandId: string): string {
  const brand = getBrand(brandId);
  if (!brand.primary) return "";
  const foreground = brand.primaryForeground ?? "oklch(0.99 0 0)";
  return [
    "var e=document.documentElement;",
    `e.setAttribute(${JSON.stringify(BRAND_ATTRIBUTE)},${JSON.stringify(brand.id)});`,
    `e.style.setProperty(${JSON.stringify(BRAND_VAR)},${JSON.stringify(brand.primary)});`,
    `e.style.setProperty(${JSON.stringify(BRAND_FOREGROUND_VAR)},${JSON.stringify(foreground)});`,
  ].join("");
}
