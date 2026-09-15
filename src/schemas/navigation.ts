import { EXTERNAL_URLS } from "@/lib/site";

export type NavId =
  | "leads"
  | "embeddedFeedback"
  | "embeddedChart"
  | "embeddedClinic"
  | "workOrders"
  | "fillTogether"
  | "editTogether"
  | "starter"
  | "definition";

interface NavBase {
  readonly id: NavId;
  readonly label: string;
  readonly description: string;
  /** A small tag after the label, for a demo that is not finished. */
  readonly badge?: "preview";
}

/** A route in this app. `schemaId` only on a page that renders one form. */
export interface NavPage extends NavBase {
  readonly path: string;
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
  readonly schemaId?: string;
}

/** Another site, always opened in a new tab. */
export interface NavLink extends NavBase {
  readonly href: string;
}

export type NavItem = NavPage | NavLink;

/** One labelled block of the sidebar. */
export interface NavGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavItem[];
}

/**
 * The sidebar, in order. A row with a `path` is a page here; a row with an
 * `href` is another site. Whether a row opens in a new tab, and carries the ↗,
 * follows from that and from `layout` — see `opensInNewTab`.
 */
export const navGroups: readonly NavGroup[] = [
  {
    id: "inYourApp",
    label: "In your app",
    items: [
      {
        id: "leads",
        label: "Leads",
        path: "/leads",
        description: "CRM opportunities: contacts, line items with totals, roles from the session.",
        schemaId: "leads",
        layout: "shell",
      },
      {
        id: "embeddedFeedback",
        label: "Feedback",
        path: "/embedded/feedback",
        description: "A survey inside a product site, addressed to the signed-in user.",
        schemaId: "customer-satisfaction",
        layout: "embedded",
      },
      {
        id: "embeddedChart",
        label: "Encounter note",
        path: "/embedded/chart",
        description: "A clinician's workspace that is nothing but the form.",
        schemaId: "encounter-note",
        layout: "embedded",
      },
      {
        id: "embeddedClinic",
        label: "Appointment",
        path: "/embedded/clinic",
        description: "A clinic form that drives the page.",
        schemaId: "clinic-visit",
        layout: "embedded",
      },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    items: [
      {
        id: "workOrders",
        label: "Work orders",
        path: "/work-orders",
        description: "Job sheets: a scan or photo into a record with AI, and back onto the sheet as PDF.",
        schemaId: "work-order",
        layout: "shell",
      },
    ],
  },
  {
    id: "together",
    label: "Together",
    items: [
      {
        id: "fillTogether",
        label: "Fill together",
        href: EXTERNAL_URLS.fillTogether,
        description: "Several people on one form, with presence.",
      },
      {
        id: "editTogether",
        label: "Edit together",
        href: EXTERNAL_URLS.editTogether,
        description: "A team in Survey Creator on one definition.",
        badge: "preview",
      },
    ],
  },
  {
    id: "forDevelopers",
    label: "For developers",
    items: [
      {
        id: "starter",
        label: "Starter",
        path: "/starter",
        description: "A checkout form and nothing else.",
        schemaId: "checkout",
        layout: "shell",
      },
      {
        id: "definition",
        label: "Definition & checks",
        path: "/definition",
        description: "Any form as JSON, with the linter.",
        layout: "shell",
      },
    ],
  },
];

/** Every sidebar row, in order. */
export const navItems: readonly NavItem[] = navGroups.flatMap((group) => group.items);

export function isNavPage(item: NavItem): item is NavPage {
  return "path" in item;
}

/** The rows that are routes in this app. */
export const navPages: readonly NavPage[] = navItems.filter(isNavPage);

/**
 * Whether a row opens in a new tab: another site, or an embedded page that
 * pretends to be one. The one source of the sidebar's ↗ and of `target="_blank"`.
 */
export function opensInNewTab(item: NavItem): boolean {
  return !isNavPage(item) || item.layout === "embedded";
}

export function navHref(item: NavItem): string {
  return isNavPage(item) ? item.path : item.href;
}

export function getNavItem(id: NavId): NavPage {
  const item = navItems.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown nav id: ${id}`);
  if (!isNavPage(item)) throw new Error(`Nav id ${id} is a link, not a page`);
  return item;
}

/** A page that renders one form, with the schema id it renders. */
export function getFormNavItem(id: NavId): NavPage & { schemaId: string } {
  const item = getNavItem(id);
  if (!item.schemaId) throw new Error(`Nav id ${id} renders no form`);
  return item as NavPage & { schemaId: string };
}

export function isActiveRoute(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}
