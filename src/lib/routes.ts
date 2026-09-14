import { navPages, type NavPage } from "@/schemas/navigation";

/** The form editor, opened on one form — the link every demo points at. */
export function configureHref(formId: string): string {
  return `/configure?form=${encodeURIComponent(formId)}`;
}

/**
 * The same page on the other edition's host.
 *
 * String concatenation rather than `new URL`, which would drop a base path. The
 * pathname only: reading the query would take `useSearchParams` in the top bar,
 * which needs a Suspense boundary and opts the static shell pages out of
 * prerendering — and no demo route uses a query.
 */
export function otherEditionHref(baseUrl: string, pathname: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${pathname}`;
}

/** Where each layout's routes live, relative to the repository root. */
const LAYOUT_FOLDERS: Record<NavPage["layout"], string> = {
  shell: "src/app/(shell)",
  embedded: "src/app",
};

/**
 * The route file that serves a demo page, for the "Source of this page" link.
 * `undefined` for a path that is not a demo, and the link does not render.
 */
export function pageSourcePath(pathname: string): string | undefined {
  const item = navPages.find((entry) => entry.path === pathname);
  return item && `${LAYOUT_FOLDERS[item.layout]}${item.path}/page.tsx`;
}
