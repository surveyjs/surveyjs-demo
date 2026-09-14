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
  readonly dataIn: readonly HowBuiltItem[];
  readonly dataOut: readonly HowBuiltItem[];
  /** Variable names whose references the panel lists, e.g. ["user"]. Empty: the section says the form reads none. */
  readonly variables: readonly string[];
  readonly features: readonly HowBuiltFeature[];
}

/** The panel's fixed wording, shared with the specs. */
export const HOW_BUILT_TEXT = {
  noVariables: "This form reads no variables.",
  notDescribed: "This page is not described yet.",
  shippedNote: "Read from the definition that ships with the template, not from a copy saved on the editor page.",
  coming: "coming",
} as const;

export const HOW_BUILT: Partial<Record<NavId, HowBuiltContent>> = {
  claims: {
    summary:
      "A records page: a list of stored claims and one form that views, edits and adds them. The form is the CMS-1500 box by box, filled from a document or by hand.",
    dataIn: [
      {
        label: "The definition",
        detail: "One JSON document for every claim: the questions, their validation and their conditions.",
        source: "src/schemas/insurance-claim.ts",
      },
      {
        label: "The record",
        detail: "getResult returns the whole stored response, loaded into the form as its data.",
        source: "src/storage/survey-results.ts",
      },
      {
        label: "The list",
        detail: "listResults returns the columns only: claim number, patient, status and total. No documents.",
        source: "src/storage/survey-results.ts",
      },
    ],
    dataOut: [
      {
        label: "The document and its columns",
        detail: "saveResult stores the response whole, and derives the list's columns from it on every write.",
        source: "src/schemas/collections/insurance-claim.ts",
      },
    ],
    variables: [],
    features: [
      { label: "AI extraction from a document", status: "shown" },
      { label: "CMS-1500 PDF", status: "shown" },
      { label: "One JSON definition, edited from the page header", status: "shown" },
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
