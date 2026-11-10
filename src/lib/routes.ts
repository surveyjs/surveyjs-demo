import { features } from "@/features";
import { isActiveRoute, navPages } from "@/schemas/navigation";

/** The form editor, opened on one form — the link every demo points at. */
export function configureHref(formId: string): string {
  return `/configure?form=${encodeURIComponent(formId)}`;
}

/** One record on a records page: `/work-orders/WO-2026-0118`. */
export function recordHref(basePath: string, id: string): string {
  return `${basePath}/${encodeURIComponent(id)}`;
}

/**
 * A file in this edition's repository.
 *
 * The one place `blob/main` is written: `brand.sourceUrl` is per edition, so a
 * link always opens the repository the reader is looking at.
 */
export function sourceHref(path: string): string {
  return `${features.brand.sourceUrl}/blob/main/${path}`;
}

/**
 * The route file that serves a demo page, for the dock's "Source of this page".
 * `undefined` for a path that is not a demo, and the link does not render.
 * A nested path maps to its page's file: `/leads/LEAD-0001` is served by the
 * `[id]` route, which renders what `leads/page.tsx` does for one record.
 */
export function pageSourcePath(pathname: string): string | undefined {
  const item = navPages.find((entry) => isActiveRoute(pathname, entry.path));
  if (!item) return undefined;
  return `src/app${item.path}/page.tsx`;
}

/**
 * The same page on the other edition's host.
 *
 * String concatenation rather than `new URL`, which would drop a base path. The
 * pathname only: reading the query would take `useSearchParams` in the dock,
 * which needs a Suspense boundary and opts the static pages out of
 * prerendering — and no demo route uses a query.
 */
export function otherEditionHref(baseUrl: string, pathname: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${pathname}`;
}
