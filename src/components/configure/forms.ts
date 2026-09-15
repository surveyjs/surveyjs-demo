import {
  checkoutSample,
  clinicVisitSample,
  customerSatisfactionSample,
  encounterNoteSample,
  getSchemaDefinition,
  type SurveyData,
  type SurveyJSON,
} from "@/schemas";
import {
  CADENCE_USER,
  RIDGELINE_USER,
  type DemoUser,
} from "@/components/embedded/shared/demo-accounts";
import { LEADS_USERS } from "@/storage/session";
import { features } from "@/features";

/**
 * Every form in the template, in one list, because one page edits all of them.
 *
 * The template used to carry a `/configure` page per form and a JSON panel inside
 * each embedded demo — four editors for the same job. There is one now, whichever
 * editor the edition ships, and it is a URL worth sharing for any form in the
 * template: `/configure?form=<id>`.
 *
 * `user` is what separates the two halves of the list. The two template forms
 * are plain: one definition, one form. The three embedded ones are rendered *for
 * somebody* — their JSON reads `{user.something}` — so the preview needs an
 * account to render for, and it uses the first of the demo's preset users. The
 * users themselves are edited in the demo, in the toolbar's popup.
 */
export interface FormEntry {
  /** The schema id, and the `?form=` value that makes the URL shareable. */
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly json: SurveyJSON;
  /** Answers behind the preview's Prefill, where the form has a sample. */
  readonly prefill?: SurveyData;
  /**
   * Set when the form is rendered per user. Only the two members that turn it
   * into the `user` variable are required, so a records page's session user
   * — a plain object, with no editor form — fits as well as a demo account.
   */
  readonly user?: Pick<DemoUser, "defaults" | "toAccount">;
  /** Where the form itself lives, and what the primary button opens. */
  readonly href: string;
  /** The primary button's label: the honest verb for where it lands. */
  readonly previewLabel: string;
  /** True when `href` is somebody else's website rather than this shell. */
  readonly embedded: boolean;
  /** The definition in the repository, for anyone who wants the real file. */
  readonly sourceHref: string;
}

/** This edition's repository, so a link to a definition opens the file it ships. */
const SOURCE_ROOT = `${features.brand.sourceUrl}/blob/main/src/schemas`;

function form(
  id: string,
  file: string,
  rest: Omit<FormEntry, "id" | "json" | "sourceHref">,
): FormEntry {
  return {
    id,
    json: getSchemaDefinition(id).json,
    sourceHref: `${SOURCE_ROOT}/${file}`,
    ...rest,
  };
}

export const FORMS: readonly FormEntry[] = [
  form("checkout", "checkout.ts", {
    label: "Checkout",
    hint: "A multi-step checkout wizard, validated page by page.",
    prefill: checkoutSample,
    href: "/starter",
    previewLabel: "Save and quit",
    embedded: false,
  }),
  form("work-order", "work-order.ts", {
    label: "Work order",
    hint: "The job sheet behind every row on the Work orders page, with a hint per box for the extractor.",
    href: "/work-orders",
    previewLabel: "Save and quit",
    embedded: false,
  }),
  form("leads", "leads.ts", {
    label: "Lead record",
    hint: "The CRM opportunity behind every row on the Leads page, rendered for its first session user.",
    // A session user is already the object the form reads, so it passes as is.
    user: { defaults: { ...LEADS_USERS[0] }, toAccount: (data) => ({ ...data }) },
    href: "/leads",
    previewLabel: "Save and quit",
    embedded: false,
  }),
  form("customer-satisfaction", "customer-satisfaction.ts", {
    label: "Satisfaction survey",
    hint: "Embedded in a product site, addressed to the signed-in account.",
    prefill: customerSatisfactionSample,
    user: CADENCE_USER,
    href: "/embedded/feedback",
    previewLabel: "View Result",
    embedded: true,
  }),
  form("encounter-note", "encounter-note.ts", {
    label: "Encounter note",
    hint: "The clinician's own note — eight pages, matrices with totals, calculated scores.",
    prefill: encounterNoteSample,
    user: RIDGELINE_USER,
    href: "/embedded/chart",
    previewLabel: "View Result",
    embedded: true,
  }),
  form("clinic-visit", "clinic-visit.ts", {
    label: "Appointment request",
    hint: "Embedded in a clinic site, filled in from the patient's chart.",
    prefill: clinicVisitSample,
    user: RIDGELINE_USER,
    href: "/embedded/clinic",
    previewLabel: "View Result",
    embedded: true,
  }),
] as const;

export const DEFAULT_FORM_ID = FORMS[0].id;

/** The form `?form=` names, falling back to the first rather than throwing. */
export function getFormEntry(id: string | null | undefined): FormEntry {
  return FORMS.find((item) => item.id === id) ?? FORMS[0];
}
