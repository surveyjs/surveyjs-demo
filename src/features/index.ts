/**
 * The edition config — the full edition's values.
 *
 * This is the one file this edition replaces; `./types.ts` and every component
 * that reads this object are copied from the MIT edition unchanged.
 *
 * Same hard rules as the MIT copy: no React, JSX or CSS imports (Playwright
 * imports this module from `e2e/`), and the commercial libraries behind these
 * actions are loaded with a dynamic `import()` when an action is called, never
 * at the top of the file.
 */
import type { Features } from "./types";

export type { Edition, Features } from "./types";

export const features: Features = {
  edition: "full",
  brand: {
    title: "SurveyJS + Next.js Template",
    badge: "Creator",
    sourceUrl: "https://github.com/surveyjs/surveyjs-nextjs-demo",
    otherEdition: { label: "MIT edition", href: "https://github.com/surveyjs/surveyjs-nextjs-demo-mit" },
  },
  designer: {
    label: "Open in Creator",
    hint: "Open this form in Survey Creator — the one designer every form in the template is edited in",
    icon: "designer",
    readySelector: ".svc-creator",
  },
  // `pdf-export` itself loads survey-pdf and the license on demand.
  exportPdf: async (json, opts) => {
    const { exportSurveyToPdf } = await import("@/lib/pdf-export");
    await exportSurveyToPdf(json, opts);
  },
  analyticsHref: (formId) => `/analytics?form=${encodeURIComponent(formId)}`,
};
