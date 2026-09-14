export type NavId =
  | "claims"
  | "checkout"
  | "records"
  | "embeddedFeedback"
  | "embeddedChart"
  | "embeddedClinic";

export interface NavItem {
  readonly id: NavId;
  readonly label: string;
  readonly path: string;
  readonly description: string;
  readonly schemaId: string;
  /**
   * Which chrome the page wears. "shell": the admin top bar and sidebar, opened in
   * the same tab; its route lives under `src/app/(shell)/`. "embedded": somebody
   * else's website with the demo dock, no sidebar, opened in a new tab; its route
   * lives under `src/app/embedded/`. The embedded demos pretend to be somebody
   * else's website, so they can't be framed by this template's chrome without
   * losing the whole point. The folder is what Next.js obeys, and
   * `e2e/top-bar.spec.ts` fails when this value and the folder disagree.
   */
  readonly layout: "shell" | "embedded";
}

export const navItems: readonly NavItem[] = [
  {
    id: "claims",
    label: "Claims",
    path: "/claims",
    description: "Patient intake / medical-insurance form.",
    schemaId: "medical-form",
    layout: "shell",
  },
  {
    id: "checkout",
    label: "Checkout",
    path: "/checkout",
    description: "Multi-step checkout wizard.",
    schemaId: "checkout",
    layout: "shell",
  },
  {
    id: "records",
    label: "Records",
    path: "/records",
    description: "Browse and edit insurance-claim records.",
    schemaId: "insurance-claim",
    layout: "shell",
  },
  {
    id: "embeddedFeedback",
    label: "Embedded: Give feedback",
    path: "/embedded/feedback",
    description: "A satisfaction survey inside a product marketing site, addressed to the signed-in user.",
    schemaId: "customer-satisfaction",
    layout: "embedded",
  },
  {
    id: "embeddedChart",
    label: "Embedded: Clinician chart",
    path: "/embedded/chart",
    description:
      "A doctor's workspace that is nothing but the survey: eight pages, matrices with totals, calculated scores and a signature.",
    schemaId: "encounter-note",
    layout: "embedded",
  },
  {
    id: "embeddedClinic",
    label: "Embedded: Family clinic",
    path: "/embedded/clinic",
    description:
      "A US clinic page whose appointment form arrives already filled from the patient's chart.",
    schemaId: "clinic-visit",
    layout: "embedded",
  },
] as const;

export function getNavItem(id: NavId): NavItem {
  const item = navItems.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown nav id: ${id}`);
  return item;
}

export function isActiveRoute(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}
