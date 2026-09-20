import { features } from "../src/features";
import { navPages } from "../src/schemas/navigation";
import { HOW_INDEX, howHref } from "../src/lib/routes";

/**
 * Compile every route before the suite starts.
 *
 * `next dev` builds a route the first time it is requested. With eight workers
 * hitting cold routes at once, some of those first requests come back as 500s
 * that have nothing to do with the app. One sequential pass up front makes the
 * run deterministic.
 *
 * The list comes from the app: the routes every edition has, plus the analytics
 * dashboard only in an edition that ships one.
 */
const ROUTES = [
  "/",
  "/leads",
  "/leads/LEAD-0001",
  "/work-orders",
  "/work-orders/WO-2026-0118",
  "/work-orders/from-document",
  "/starter",
  "/definition",
  "/configure?form=work-order",
  ...(features.analyticsHref ? [features.analyticsHref("work-order")] : []),
  "/embedded/feedback",
  "/embedded/clinic",
  "/embedded/chart",
  // The "how it's built" index and one explainer per example this edition has.
  HOW_INDEX,
  ...navPages.map((item) => howHref(item.path)),
];

async function waitForServer(baseUrl: string): Promise<void> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      await fetch(baseUrl);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Dev server at ${baseUrl} never came up.`);
}

export default async function warmDevRoutes(): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3100";
  await waitForServer(baseUrl);
  for (const route of ROUTES) {
    const response = await fetch(`${baseUrl}${route}`);
    if (!response.ok && response.status !== 307) {
      throw new Error(`Warm-up failed for ${route}: ${response.status}`);
    }
    await response.text();
  }
}
