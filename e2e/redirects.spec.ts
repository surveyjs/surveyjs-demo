import { test, expect } from "@playwright/test";

/**
 * Every redirect in `next.config.mjs`, and the only place in `e2e/` that names a
 * retired path. Temporary (307) on purpose: browsers cache a 308, and these
 * pages have moved before.
 */
const REDIRECTS = [
  // Legacy paths; links to them are out in the world.
  ["/records", "/work-orders"],
  ["/claims", "/work-orders"],
  ["/checkout", "/starter"],
  ["/checkout/configure", "/configure?form=checkout"],
  ["/records/configure", "/configure?form=work-order"],
  ["/claims/configure", "/configure?form=work-order"],
  // The explainers' index is the root index now, and the retired page's
  // application is linked from the site's use-cases page directly.
  ["/how", "/"],
  ["/mysurveys", "/"],
  ["/mysurveys/how", "/"],
  // The host pages, from before they lost their prefix.
  ["/embedded/feedback", "/feedback"],
  ["/embedded/chart", "/chart"],
  ["/embedded/clinic", "/clinic"],
  ["/embedded/clinic/how", "/clinic/how"],
] as const;

for (const [from, to] of REDIRECTS) {
  test(`${from} redirects to ${to}`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe(to);
  });
}
