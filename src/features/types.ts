/**
 * The shape of an edition config — shared code.
 *
 * Every edition of this template carries this file unchanged; what differs is
 * the values in `./index.ts`. Keep it free of React, JSX and CSS: Playwright
 * imports the config from `e2e/`.
 */
import type { SurveyData, SurveyJSON } from "@/schemas";

export type Edition = "mit" | "full";

export interface Features {
  edition: Edition;
  brand: {
    /** The edition pill in the top bar: "MIT" or "Full". */
    editionLabel: string;
    /** This edition's repository. The page-source link and forms.ts build on it. */
    sourceUrl: string;
    /** The same app on the other host. The switch link keeps the pathname. */
    otherEdition: { label: string; baseUrl: string };
  };
  designer: {
    /** Text of the button that opens a form in its editor. */
    label: string;
    /** Tooltip for that button. */
    hint: string;
    /** Icon key; components map it to a lucide icon. No React in this file. */
    icon: "json" | "designer";
    /** Selector Playwright waits for once /configure has loaded its editor. */
    readySelector: string;
  };
  /** The form as a document. Undefined here: no button renders. */
  exportPdf?: (json: SurveyJSON, opts: { label: string; data?: SurveyData }) => Promise<void>;
  /** The dashboard for one form's responses. Undefined here: no link renders. */
  analyticsHref?: (formId: string) => string;
}
