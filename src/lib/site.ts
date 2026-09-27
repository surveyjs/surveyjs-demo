/**
 * The demo's name, the site it belongs to and the dock's wording — the same in
 * every edition.
 *
 * Plain constants on purpose: nothing here is secret or differs per deployment,
 * so a change is an edit here, not an environment variable. No React either:
 * Playwright imports this module from `e2e/`.
 */

export const DEMO_NAME = "SurveyJS in your app";

/**
 * The site's use-cases page: where visitors arrive from, and where the dock's
 * "More examples" menu sends them back. A manifest entry's `useCaseAnchor` is a
 * section of it.
 */
export const USE_CASES_URL = "https://surveyjs.io/use-cases";

/**
 * The mark after a link that opens in a new tab: ↗, with the text-presentation
 * selector, or Windows draws it as a blue emoji tile.
 */
export const NEW_TAB_MARK = "↗︎";

/**
 * What the dock calls its controls, on every page that has one. Specs import
 * these, so a label is changed here and nowhere else.
 */
export const DOCK_LABELS = {
  /** The toolbar's accessible name. */
  toolbar: "Demo tools",
  moreExamples: "More examples",
  allUseCases: "All use cases",
  /** The "⋯" menu that holds what the bar has no room for. */
  overflow: "More demo tools",
  prefill: "Prefill",
  /** An embedded demo's: start the form again. */
  reset: "Reset",
  /** A records page's: this visitor's stored data, after a confirm dialog. */
  resetData: "Reset demo data",
  savePdf: "Save as PDF",
  analytics: "Analytics",
  loginAs: "Login as",
  editUser: "Edit the user",
  seeNext: "See next",
} as const;

/** Worded once, for the dock and the specs. */
export const PAGE_ACTIONS = {
  source: "Source of this page",
  howBuilt: "How this page is built",
} as const;
