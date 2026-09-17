import { EXTERNAL_URLS, SITE_LINKS } from "@/lib/site";

/**
 * Everything the MySurveys page says, in one place and with no React, so
 * `e2e/mysurveys.spec.ts` asserts the copy the page renders rather than a second
 * copy of it.
 *
 * The page belongs to the full edition (its sidebar row is `edition: "full"`): it
 * says MySurveys is built from the same libraries as this demo, Survey Creator
 * and Dashboard included, which is true only where the demo ships them.
 */
export const MYSURVEYS_COPY = {
  // The heading is the sidebar label, as on every page (`e2e/sidebar.spec.ts`),
  // so what MySurveys is opens the description instead.
  description:
    "A form management application built with SurveyJS. Everything on this page is built from the same libraries as the rest of this demo: your users create forms, run them, and see the results — a working example of the application many customers build first.",
} as const;

export interface MySurveysScreenshot {
  readonly id: string;
  /** What the capture shows, and the label of its frame until it exists. */
  readonly label: string;
  readonly caption: string;
  /** Under `public/`. A PNG added here replaces the frame at the next build. */
  readonly file: string;
}

export const MYSURVEYS_SCREENSHOTS: readonly MySurveysScreenshot[] = [
  {
    id: "list",
    label: "Form list",
    caption: "Every form your users created, with run, edit and results.",
    file: "/mysurveys/list.png",
  },
  {
    id: "creator",
    label: "Survey Creator",
    caption: "The same designer you saw on the Customize pages, here in its natural place.",
    file: "/mysurveys/creator.png",
  },
  {
    id: "run",
    label: "A running form",
    caption: "Any form, shared by link and filled in the browser.",
    file: "/mysurveys/run.png",
  },
  {
    id: "results",
    label: "Results",
    caption: "Dashboard over the responses; any response as a PDF.",
    file: "/mysurveys/results.png",
  },
];

/** The words of a frame that has no capture yet. */
export const MYSURVEYS_FRAME_TEXT = "Screenshot to be added";

export interface MySurveysPath {
  readonly id: string;
  readonly heading: string;
  readonly copy: string;
  readonly button: string;
  readonly href: string;
}

const serverIntegration = SITE_LINKS.find((link) => link.id === "serverIntegration")!;

export const MYSURVEYS_PATHS: readonly MySurveysPath[] = [
  {
    id: "hosted",
    heading: "Run it hosted",
    // "For years", and no sentence about stored data being cleaned: neither a
    // launch year nor a retention policy is published anywhere to cite.
    copy: "Requires a free surveyjs.io account — the same account used for support and licensing — so your forms keep a persistent home across visits. MySurveys has been online for years and is the starting point many customers built their own form-management apps from. It is a demo application, not a hosted service: don't run production surveys on it.",
    button: "Open MySurveys",
    href: EXTERNAL_URLS.mySurveys,
  },
  {
    id: "builder",
    heading: "Try the builder with no account",
    copy: "Opens Survey Creator directly — nothing to sign up for. That page is the builder alone; MySurveys is a whole application built around it.",
    button: "Create a free survey",
    href: EXTERNAL_URLS.createFreeSurvey,
  },
  {
    id: "build",
    heading: "Build it yourself",
    copy: "The same application implemented for ASP.NET Core, Node.js, PHP and more — source code and the server contract, ready to clone. This is the path that ends in your app.",
    button: serverIntegration.label,
    href: serverIntegration.href,
  },
];
