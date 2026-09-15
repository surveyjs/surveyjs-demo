/**
 * What the "How this page is built" panel says about each page.
 *
 * Content only, and no React, so `e2e/` can import it and assert the panel says
 * exactly this. The list of variable references is not written here: the panel
 * derives it from the definition with `findVariableReferences`, so it cannot
 * drift from the JSON.
 */
import type { Edition } from "@/features";
import type { NavId } from "@/schemas/navigation";

export interface HowBuiltItem {
  readonly label: string;
  readonly detail: string;
  /** A repository path; the panel links it under `features.brand.sourceUrl`. */
  readonly source?: string;
  /** Set for data only one edition has. The other edition does not list it. */
  readonly edition?: Edition;
}

export interface HowBuiltFeature {
  readonly label: string;
  /** "shown": this page does it now. "coming": planned, and labelled as such. */
  readonly status: "shown" | "coming";
  /** Set for a feature only one edition has. The other edition labels the chip with that edition's name. */
  readonly edition?: Edition;
}

export interface HowBuiltContent {
  readonly summary: string;
  /** For a records page: what the list beside the form is, rendered small under `summary`. */
  readonly listNote?: string;
  readonly dataIn: readonly HowBuiltItem[];
  readonly dataOut: readonly HowBuiltItem[];
  /** Variable names whose references the panel lists, e.g. ["user"]. Empty: the section says the form reads none. */
  readonly variables: readonly string[];
  readonly features: readonly HowBuiltFeature[];
}

/** The items this edition lists: the panel renders these, and the specs expect them. */
export function itemsInEdition(items: readonly HowBuiltItem[], edition: Edition): HowBuiltItem[] {
  return items.filter((item) => item.edition === undefined || item.edition === edition);
}

/** The panel's fixed wording, shared with the specs. */
export const HOW_BUILT_TEXT = {
  noVariables: "This form reads no variables.",
  notDescribed: "This page is not described yet.",
  shippedNote: "Read from the definition that ships with the template, not from a copy saved on the editor page.",
  coming: "coming",
} as const;

/** The same note on both records pages. */
const RECORDS_LIST_NOTE =
  "The list on the left is this application's own React component, not a SurveyJS one. An editable list view built on the SurveyJS matrix is planned; it is not in this demo.";

export const HOW_BUILT: Partial<Record<NavId, HowBuiltContent>> = {
  leads: {
    summary:
      "A CRM opportunity as one form: contacts in a dynamic panel, line items and totals in matrices, and rules that follow the signed-in user. Seven columns are derived from each record, and the list shows three of them; the form edits the whole document.",
    listNote: RECORDS_LIST_NOTE,
    dataIn: [
      {
        label: "The definition",
        detail: "Three pages of JSON: every question, every total and every rule on this page, including the ones that read the user.",
        source: "src/schemas/leads.ts",
      },
      {
        label: "The record",
        detail: "getResult returns the whole stored document, contacts, rows and ids included, loaded into the form as its data.",
        source: "src/storage/survey-results.ts",
      },
      {
        label: "variables.user",
        detail: "listSessionUsers(\"leads\") returns who the page is rendered for: name, role and currency. In your app, getSession(). Budget amount is shown to managers only; a discount above 20% needs a manager to save.",
        source: "src/storage/session.ts",
      },
      {
        label: "New-lead defaults",
        detail: "newRecord sets the owner and the currency from the signed-in user, in code, so opening an existing lead never rewrites them.",
        source: "src/schemas/collections/leads.ts",
      },
    ],
    dataOut: [
      {
        label: "The document",
        detail: "saveResult stores every answer, and gives each contact and row without one a stable id.",
        source: "src/storage/survey-results.ts",
      },
      {
        label: "Seven columns",
        detail: "toColumns derives account, owner name, stage, deal value (recomputed from the line items), next step date, currency and expected close. The list reads only these.",
        source: "src/schemas/collections/leads.ts",
      },
    ],
    variables: ["user"],
    features: [
      { label: "Variables from the server", status: "shown" },
      { label: "Expressions over a dynamic panel and matrices", status: "shown" },
      { label: "Mapped columns plus the document", status: "shown" },
      { label: "Choices from your API", status: "coming" },
      { label: "An async validator calling the server", status: "coming" },
      { label: "Live updates with presence", status: "coming" },
      { label: "PDF export", status: "shown", edition: "full" },
      { label: "Dashboard (View analytics)", status: "shown", edition: "full" },
      { label: "Survey Creator (Open in Creator)", status: "shown", edition: "full" },
    ],
  },
  workOrders: {
    summary:
      "A field service job sheet as one form: a list of stored work orders, and one form that views, edits and adds them. A filled sheet becomes a draft record through AI extraction.",
    listNote: RECORDS_LIST_NOTE,
    dataIn: [
      {
        label: "The definition",
        detail: "Two pages of JSON: the questions, the totals, the rules that require a signature, and an aiHint per question naming its box on the sheet.",
        source: "src/schemas/work-order.ts",
      },
      {
        label: "The record",
        detail: "getResult returns the whole stored document, loaded into the form as its data.",
        source: "src/storage/survey-results.ts",
      },
      {
        label: "The list",
        detail: "listResults returns the columns only: job number, customer, equipment, status and total. No documents.",
        source: "src/storage/survey-results.ts",
      },
      {
        label: "An uploaded document",
        detail: "A PDF, scan or photo of a filled sheet, read by /api/extract against the definition, and kept by keepSourceDocument as the new record's original.",
        source: "src/storage/documents.ts",
      },
    ],
    dataOut: [
      {
        label: "The document",
        detail: "saveResult stores every answer. A record read from a document also stores a link to its original and when it was read: forced by fromDocument.pinned, never taken from the model's answers.",
        source: "src/schemas/collections/work-order.ts",
      },
      {
        label: "Five columns",
        detail: "toColumns derives job number, customer, equipment, status and the total, recomputed from the parts and labor. The list reads only these.",
        source: "src/schemas/collections/work-order.ts",
      },
      {
        label: "The job sheet PDF",
        detail: "Save as PDF prints the record box by box onto the company's blank, adding continuation sheets for as many parts as it has.",
        source: "src/features/full/work-order-pdf.ts",
        edition: "full",
      },
    ],
    variables: [],
    features: [
      { label: "AI extraction from a PDF, scan or photo", status: "shown" },
      { label: "Job sheet PDF", status: "shown", edition: "full" },
      { label: "One JSON definition, edited from the page header", status: "shown" },
      { label: "Choices from your API", status: "coming" },
      { label: "Per-field confidence in the review", status: "coming" },
      { label: "Survey Creator (Open in Creator)", status: "shown", edition: "full" },
      { label: "Dashboard (View analytics)", status: "shown", edition: "full" },
    ],
  },
};

export interface VariableReference {
  /** The nearest enclosing `name`: `(survey)` at the root, `lineItems › discountPct` in a matrix. */
  readonly element: string;
  readonly property: string;
  readonly expression: string;
}

/** Arrays whose items are elements, or sit on one. */
const CHILD_ARRAYS = new Set([
  "pages",
  "elements",
  "templateElements",
  "columns",
  "choices",
  "validators",
  "triggers",
  "calculatedValues",
]);

/** Children named relative to their container: a matrix column, a dynamic panel's template. */
const NESTED_ARRAYS = new Set(["columns", "templateElements"]);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Every string property in a definition that references `{<name>.…}` or `{<name>}`
 * for one of `names`, with the element it sits on. A JSON walk: no model, no DOM.
 */
export function findVariableReferences(
  json: unknown,
  names: readonly string[],
): VariableReference[] {
  if (names.length === 0) return [];
  // `{user}`, `{user.role}`, `{user[0]}` — never `{userName}`.
  const pattern = new RegExp(`\\{\\s*(?:${names.map(escapeRegExp).join("|")})(?:[.\\[][^}]*)?\\s*\\}`);
  const found: VariableReference[] = [];

  const check = (element: string, property: string, value: unknown) => {
    if (typeof value === "string" && pattern.test(value)) {
      found.push({ element, property, expression: value });
    }
  };

  const walk = (node: unknown, parent: string, prefix: string | undefined) => {
    if (!isObject(node)) return;
    const element =
      typeof node.name === "string" && node.name
        ? prefix
          ? `${prefix} › ${node.name}`
          : node.name
        : parent;

    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value) && CHILD_ARRAYS.has(key)) {
        const childPrefix = NESTED_ARRAYS.has(key) ? element : undefined;
        for (const child of value) walk(child, element, childPrefix);
      } else if (isObject(value)) {
        // A localized string: `{ "default": "...", "es": "..." }`.
        for (const [locale, text] of Object.entries(value)) check(element, `${key}.${locale}`, text);
      } else if (key !== "name") {
        check(element, key, value);
      }
    }
  };

  walk(json, "(survey)", undefined);
  return found;
}
