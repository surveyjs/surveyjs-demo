/**
 * The route registry: every example page in this application, by `NavId`.
 *
 * What a page is called, where it lives and which form it renders. The dock
 * finds a page's explainer and source file here, the metadata its fallback copy,
 * the explainers their `<h1>` and their order. Which examples the dock's menu and
 * the root index list is the examples manifest's business, `src/examples/`: an
 * entry's `id` is the page's `NavId`.
 *
 * No React: Playwright imports this from `e2e/`.
 */

export type NavId =
  | "leads"
  | "workOrders"
  | "embeddedFeedback"
  | "embeddedChart"
  | "embeddedClinic"
  | "starter"
  | "definition";

/**
 * What finishing a page's form does.
 *
 * - `"complete"` — a one-way submission. The survey completes and SurveyJS shows
 *   the definition's own `completedHtml`: the visitor is done with the form.
 * - `"save"` — a record somebody keeps working with. The survey never
 *   completes: the answers are saved, {@link CHANGES_SAVED} appears over the
 *   page, and the form stays where it was.
 *
 * `useFinish` in `src/components/useFinish.ts` is the one place both are written.
 */
export type FinishMode = "complete" | "save";

/** What a `"save"` page says once the server has stored its answers. */
export const CHANGES_SAVED = "Changes saved";

/** A route in this app. `schemaId` and `finish` only on a page that renders one form. */
export interface NavPage {
  readonly id: NavId;
  readonly label: string;
  /** The page's own line: the header of Starter and Definition, and every page's fallback meta description. */
  readonly description: string;
  /** The route. Its file is `src/app<path>/page.tsx`, and its explainer `<path>/how`. */
  readonly path: string;
  readonly schemaId?: string;
  readonly finish?: FinishMode;
}

/** Every page, in the manifest's order, which is also the explainers' previous / next. */
export const navPages: readonly NavPage[] = [
  {
    id: "leads",
    label: "Leads",
    path: "/leads",
    description: "CRM opportunities: contacts, line items with totals, roles from the session.",
    schemaId: "leads",
    finish: "save",
  },
  {
    id: "workOrders",
    label: "Work orders",
    path: "/work-orders",
    description: "Job sheets: a PDF, scan or photo into a record with AI.",
    schemaId: "work-order",
    finish: "save",
  },
  {
    id: "embeddedFeedback",
    label: "Feedback",
    path: "/feedback",
    description: "A survey inside a product site, addressed to the signed-in user.",
    schemaId: "customer-satisfaction",
    finish: "complete",
  },
  {
    id: "embeddedChart",
    label: "Encounter note",
    path: "/chart",
    description: "A clinician's workspace that is nothing but the form.",
    schemaId: "encounter-note",
    finish: "complete",
  },
  {
    id: "embeddedClinic",
    label: "Appointment",
    path: "/clinic",
    description: "A clinic form that updates the page around it — in English and Spanish.",
    schemaId: "clinic-visit",
    finish: "complete",
  },
  {
    id: "starter",
    label: "Starter",
    path: "/starter",
    description: "A checkout form and nothing else.",
    schemaId: "checkout",
    finish: "complete",
  },
  {
    id: "definition",
    label: "Definition & checks",
    path: "/definition",
    description: "Any form as JSON, with the linter.",
  },
];

export function getNavItem(id: NavId): NavPage {
  const item = navPages.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown nav id: ${id}`);
  return item;
}

/** A page that renders one form, with the schema id it renders and what finishing it does. */
export function getFormNavItem(id: NavId): NavPage & { schemaId: string; finish: FinishMode } {
  const item = getNavItem(id);
  if (!item.schemaId) throw new Error(`Nav id ${id} renders no form`);
  if (!item.finish) throw new Error(`Nav id ${id} renders a form and says nothing about finishing it`);
  return item as NavPage & { schemaId: string; finish: FinishMode };
}

export function isActiveRoute(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}
