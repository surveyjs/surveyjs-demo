/**
 * The demo's name and the site around it — the same in every edition.
 *
 * Plain constants on purpose: nothing here is secret or differs per deployment,
 * so a change is an edit here, not an environment variable. No React either:
 * Playwright imports this module from `e2e/`.
 */

export const DEMO_NAME = "SurveyJS in your app";

/** The site this demo belongs to, linked from the top bar and opened in a new tab. */
export const SITE_LINKS = [
  { id: "useCases", label: "Use cases", href: "https://surveyjs.io/use-cases" },
  {
    id: "serverIntegration",
    label: "Server integration",
    href: "https://surveyjs.io/backend-integration/examples",
  },
  { id: "docs", label: "Documentation", href: "https://surveyjs.io/backend-integration" },
] as const;

/**
 * The demos that live on their own hosts, linked from the sidebar, and the two
 * places the MySurveys page sends people. All opened in a new tab.
 */
export const EXTERNAL_URLS = {
  fillTogether: "https://collaborative-form-filling.demos.surveyjs.io",
  editTogether: "https://collaborative-form-editing.demos.surveyjs.io",
  // The hosted application; it asks for a surveyjs.io account first.
  mySurveys: "https://surveyjs.io/Service/MySurveys",
  // Survey Creator on its own, with nothing to sign up for.
  createFreeSurvey: "https://surveyjs.io/create-free-survey",
} as const;

/** Shared with the embedded demo dock later, so the two never word these differently. */
export const PAGE_ACTIONS = {
  source: "Source of this page",
  howBuilt: "How this page is built",
  /**
   * The index of every example's explainer, which the top bar offers **on an
   * explainer only** — on the example itself the link above is the one worth
   * having, and a second, vaguer one beside it would only blur it. Worded in
   * parallel with it all the same: the only thing that differs between the two
   * is *this page* against *every page*.
   */
  howIndex: "How every page is built",
} as const;
