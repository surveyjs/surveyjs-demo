/**
 * The little the "how it's built" pages do not read out of Markdown.
 *
 * Everything an explainer says about an example is in `how/<route>.md` — the
 * words, the links, the files, the quoted definitions. What is left here is the
 * fixed chrome wording the page, the index and the specs share, and the walk
 * over a definition that lets `e2e/how-integrity.spec.ts` check a quoted block
 * against the JSON that actually ships.
 *
 * No React, so `e2e/` can import it.
 */
import { features } from "@/features";

/** Wording the explainer, the index and the specs share. */
export const HOW_BUILT_TEXT = {
  /** The index card's way into an explainer. */
  readHow: "Read how it's built",
  /** Beside "Open this example" at the top of an explainer, and again at the foot. */
  allExamples: "All examples",
  openExample: "Open this example",
  /** The badge the loader appends to a block only the other edition ships. */
  otherEdition: `available in the ${features.brand.otherEdition.label}`,
} as const;

/** One string, number or boolean written somewhere in a definition. */
export interface DefinitionProperty {
  /** The nearest enclosing `name`: `(survey)` at the root, `lineItems › discountPct` in a matrix. */
  readonly element: string;
  readonly property: string;
  readonly value: string | number | boolean;
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Every value written in a definition, with the element it sits on. A JSON walk:
 * no model, no DOM.
 *
 * This is what a ```` ```json definition=budgetAmount.visibleIf ```` block in a
 * how file is checked against. The block's text is written out in the Markdown,
 * so the file reads whole on GitHub and in an editor; the test fails when the
 * definition no longer says that, which is drift caught rather than a page
 * quietly lying.
 *
 * An element and a property do not identify one entry: a choice carries its
 * parent question's name, so `chartProblems.visibleIf` is nine different
 * expressions. A quotation matches when **any** of them is the text in the file.
 */
export function collectProperties(json: unknown): DefinitionProperty[] {
  const found: DefinitionProperty[] = [];

  const check = (element: string, property: string, value: unknown) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      found.push({ element, property, value });
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
