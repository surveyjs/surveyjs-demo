import { test, expect } from "@playwright/test";

/**
 * `/configure` is the designer every form opens in: Survey Creator, full page,
 * on one form — no sidebar, no list of the other forms. `?form=` says which one.
 *
 * The designer is a browser application loaded on the client, so these tests are
 * deliberately about the page around it and the storage seam under it; what the
 * Creator itself does with a definition is the Creator's own test suite.
 */

async function waitForCreator(page: import("@playwright/test").Page) {
  // A heavy client-only bundle: under parallel workers, and against `next dev`
  // where the route compiles on first request, it needs longer than the default.
  await expect(page.locator(".svc-creator").first()).toBeVisible({ timeout: 45_000 });
}

test("the designer opens on one form, with no chrome around it", async ({ page }) => {
  test.slow();
  await page.goto("/configure?form=checkout");
  await waitForCreator(page);

  // No sidebar, and no way to wander into another form from here.
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/starter");
  await expect(page.getByText("Checkout — form designer")).toBeVisible();
});

test("a personalized form names the user its preview is rendered for", async ({
  page,
}) => {
  test.slow();
  await page.goto("/configure?form=clinic-visit");
  await waitForCreator(page);

  await expect(page.getByText(/Previewed for Maria Delgado/)).toBeVisible();
  // Straight back out to the site the form lives in.
  await expect(page.getByRole("button", { name: "View Result" })).toBeVisible();
});

test("the primary button lands on the page the form lives in", async ({ page }) => {
  test.slow();
  await page.goto("/configure?form=clinic-visit");
  await waitForCreator(page);

  await page.getByRole("button", { name: "View Result" }).click();
  await expect(page).toHaveURL(/\/embedded\/clinic$/);
  await expect(page.locator("[data-survey-root]")).toBeVisible();
});
