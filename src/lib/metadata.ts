/**
 * Page titles, descriptions, canonicals and social tags — for every edition.
 *
 * Shared code: the full edition carries this file unchanged. The copy is written
 * once, here, and what differs between editions is picked by `features.edition`,
 * the same switch the top bar reads. No React: `robots.ts` and the route files
 * import it, and nothing here touches the DOM.
 *
 * Three environment variables, all read at build time (`NEXT_PUBLIC_` values are
 * inlined, so changing one means rebuilding):
 *
 *  - `NEXT_PUBLIC_SITE_URL` — this host, the `metadataBase` social tags resolve
 *    against. Defaults to `http://localhost:3000`.
 *  - `NEXT_PUBLIC_CANONICAL_URL` — the host every canonical and `og:url` points
 *    at. Defaults to `NEXT_PUBLIC_SITE_URL`, so each page is canonical to itself.
 *    Set it to the other edition's host to hand that host every query.
 *  - `NEXT_PUBLIC_INDEXABLE` — `"false"` emits `noindex` and a `robots.txt` that
 *    disallows crawling. Anything else, or unset, leaves the site indexable.
 */
import type { Metadata } from "next";
import { features, type Edition } from "@/features";
import { getNavItem, navPages, type NavId } from "@/schemas/navigation";
import { getHowContent } from "@/lib/how-content";
import { HOW_INDEX, howHref } from "@/lib/routes";
import { DEMO_NAME } from "@/lib/site";

export const SITE_NAME = DEMO_NAME;

/** Text that differs by edition, or one string that serves both. */
type EditionText = string | Readonly<Record<Edition, string>>;

function forEdition(text: EditionText): string {
  return typeof text === "string" ? text : text[features.edition];
}

/** What follows every page title. The one edition-aware piece of the template. */
const TITLE_SUFFIX = forEdition({
  full: ` · ${SITE_NAME}`,
  mit: ` · ${SITE_NAME} (MIT)`,
});

export const TITLE_TEMPLATE = `%s${TITLE_SUFFIX}`;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
const CANONICAL_URL = (process.env.NEXT_PUBLIC_CANONICAL_URL || SITE_URL).replace(/\/+$/, "");

export const metadataBase = new URL(SITE_URL);

/** `NEXT_PUBLIC_INDEXABLE`, read once: only the literal `"false"` turns indexing off. */
export const indexable = process.env.NEXT_PUBLIC_INDEXABLE !== "false";

/** Concatenated rather than `new URL(path, base)`, which would drop a base path. */
function canonicalUrl(path: string): string {
  return `${CANONICAL_URL}${path}`;
}

interface PageCopy {
  readonly title: EditionText;
  readonly description: EditionText;
}

/** The root, which redirects to the first page but is the link people share. */
const ROOT_COPY: PageCopy = {
  title: {
    full: `${SITE_NAME} — live demo`,
    mit: `${SITE_NAME} — MIT edition`,
  },
  description: {
    full: "A working app with SurveyJS forms in it: CRM records, an embedded survey, a clinician's workspace, paper forms as data. Plus designer, PDF export, dashboards.",
    mit: "The same demo, built only with MIT-licensed SurveyJS: CRM records, an embedded survey, a clinician's workspace, AI extraction from scans. Clone it and start.",
  },
};

/**
 * Per page, keyed by sidebar row. A description that names a feature only the
 * full edition has needs an `mit` variant that does not. A page missing here takes its sidebar
 * label and description instead — see `pageCopy`.
 */
const PAGE_COPY: Partial<Record<NavId, PageCopy>> = {
  leads: {
    title: "Leads — CRM opportunity records",
    description:
      "One form to view, edit and add opportunities: contacts, line items with live totals, a security review, and rules that follow the signed-in user's role. Saved as a document and back to your list columns.",
  },
  workOrders: {
    title: "Work orders — field service job sheets",
    description: {
      full: "One form to view, edit and add job sheets: read a filled sheet from a PDF, scan or photo with AI, keep a link to the original, and print the record back onto the company's own sheet.",
      mit: "One form to view, edit and add job sheets: read a filled sheet from a PDF, scan or photo with AI, and keep a link to the original.",
    },
  },
  embeddedFeedback: {
    title: "Feedback — a survey in a product site",
    description:
      "A satisfaction survey embedded in a marketing site, addressed to the signed-in user and styled by the site's own CSS framework.",
  },
  embeddedChart: {
    title: "Encounter note — a clinician's workspace",
    description:
      "A complex internal form that is the whole screen: eight pages, matrices with totals, calculated scores and a signature.",
  },
  embeddedClinic: {
    title: "Appointment — a form that drives the page",
    description:
      "A clinic request form whose answers update the visit summary, copay and referral notice beside it. One definition, English and Spanish.",
  },
  mySurveys: {
    title: "MySurveys — built with SurveyJS",
    description:
      "A form management application built from the same libraries as this demo: your users create forms, run them and see the results.",
  },
  starter: {
    title: "Starter — the smallest page",
    description:
      "A multi-step checkout form and nothing else: the place to start when you clone the application.",
  },
  definition: {
    title: "Definition & checks — the form as JSON",
    description:
      "The developer's view: the form definition as JSON with static analysis running on every change, and the rendered result beside it.",
  },
};

function pageCopy(id: NavId): PageCopy {
  const nav = getNavItem(id);
  return PAGE_COPY[id] ?? { title: nav.label, description: nav.description };
}

/**
 * Everything a page emits. `openGraph` and `twitter` are replaced, not merged,
 * by a child segment, so each page sets them whole; `title` there is the title
 * as rendered, suffix included, because the template does not reach them.
 */
function buildMetadata(copy: PageCopy, path: string, templated: boolean): Metadata {
  const title = forEdition(copy.title);
  const description = forEdition(copy.description);
  const renderedTitle = templated ? `${title}${TITLE_SUFFIX}` : title;
  const url = canonicalUrl(path);
  return {
    title: templated ? title : { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: renderedTitle,
      description,
      url,
    },
    // No OG image exists yet; `summary_large_image` waits for one.
    twitter: { card: "summary", title: renderedTitle, description },
  };
}

/**
 * The root layout's metadata: the template, the base URL, indexing, and the
 * root's own copy as the fallback for anything that sets none (the 404). No
 * canonical here — a page inherits what it does not set, and a canonical to `/`
 * on every page would be wrong.
 */
export const siteMetadata: Metadata = {
  metadataBase,
  applicationName: SITE_NAME,
  title: { default: forEdition(ROOT_COPY.title), template: TITLE_TEMPLATE },
  description: forEdition(ROOT_COPY.description),
  robots: indexable ? undefined : { index: false, follow: true },
  openGraph: { type: "website", siteName: SITE_NAME },
  twitter: { card: "summary" },
};

/** The root route's metadata: its own title, which the template does not wrap. */
export const rootMetadata: Metadata = buildMetadata(ROOT_COPY, "/", false);

/** A sidebar page's metadata, canonical to its own path. */
export function pageMetadata(id: NavId): Metadata {
  return buildMetadata(pageCopy(id), getNavItem(id).path, true);
}

/**
 * An example's "how it's built" page, canonical to `/x/how`.
 *
 * The description is the `summary` in the Markdown file's front matter — the
 * one sentence the page opens with and the index lists — so there is no second
 * copy of it here, and renaming the sidebar row renames the page.
 */
export function howMetadata(id: NavId): Metadata {
  const nav = getNavItem(id);
  return buildMetadata(
    {
      title: `${nav.label} — how it's built`,
      description: getHowContent(id).summary,
    },
    howHref(nav.path),
    true,
  );
}

/** The index of the explainers. Its own copy: it describes no single example. */
export const howIndexMetadata: Metadata = buildMetadata(
  {
    title: "How it's built — every example",
    description:
      "One page per example in this demo: what goes into the form, what its definition does with it, what comes back out, and every file behind it.",
  },
  HOW_INDEX,
  true,
);

/**
 * A tool opened on one form — `/configure?form=`, `/analytics?form=` — titled
 * after the page that form lives on ("Starter — the smallest page — Customize")
 * with that page's description. `formPath` is the form's page, `selfPath` this
 * tool's own URL for the canonical.
 */
export function formToolMetadata(formPath: string, toolLabel: string, selfPath: string): Metadata {
  const id = navIdForPath(formPath);
  const copy = pageCopy(id);
  return buildMetadata(
    { title: `${forEdition(copy.title)} — ${toolLabel}`, description: copy.description },
    selfPath,
    true,
  );
}

function navIdForPath(path: string): NavId {
  const item = navPages.find((entry) => entry.path === path);
  if (!item) throw new Error(`No sidebar page at ${path}`);
  return item.id;
}
