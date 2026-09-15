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

/** Every `aiHint` in a definition, by the name of the element that carries it (`(survey)` at the root). */
function hintsOf(json: unknown): Record<string, string> {
  const found: Record<string, string> = {};
  const walk = (node: unknown, name: string) => {
    if (Array.isArray(node)) return node.forEach((item) => walk(item, name));
    if (!node || typeof node !== "object") return;
    const element = node as Record<string, unknown>;
    const own = typeof element.name === "string" ? element.name : name;
    if (typeof element.aiHint === "string") found[own] = element.aiHint;
    for (const [key, value] of Object.entries(element)) if (key !== "aiHint") walk(value, own);
  };
  walk(json, "(survey)");
  return found;
}

test("Creator edits the AI extraction hint under Description, and a save keeps every hint", async ({ page }) => {
  test.slow();
  const { workOrderJson } = await import("../src/schemas/work-order");
  const shipped = hintsOf(workOrderJson);
  expect(Object.keys(shipped).length).toBeGreaterThan(30);

  // The designer renders questions as they scroll into view; this one is near the top.
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/configure?form=work-order");
  await waitForCreator(page);
  const grid = page.locator(".svc-side-bar");

  /** The property grid's rows, in order, as property names. */
  const rows = () => grid.locator("[data-name]").evaluateAll((els) => els.map((el) => el.getAttribute("data-name")));

  // A question: its own hint, on the row after Description.
  await page.locator('[data-sv-drop-target-survey-element="jobNumber"] .svc-question__content').first().click({ position: { x: 60, y: 8 } });
  const hint = grid.locator('[data-name="aiHint"]');
  await expect(hint).toContainText("AI extraction hint");
  await expect(hint.locator("textarea")).toHaveValue(shipped.jobNumber);
  let names = await rows();
  expect(names.indexOf("aiHint")).toBe(names.indexOf("description") + 1);

  // The survey: the survey-level hint, in the same place.
  await page.locator(".svc-designer-header").first().click({ position: { x: 20, y: 20 } });
  await expect(hint.locator("textarea")).toHaveValue(shipped["(survey)"]);
  names = await rows();
  expect(names.indexOf("aiHint")).toBe(names.indexOf("description") + 1);

  // Edit it and save: the stored definition keeps the edit and every other hint.
  const edited = `${shipped["(survey)"]} Edited in Creator.`;
  await hint.locator("textarea").fill(edited);
  await hint.locator("textarea").press("Tab");
  await page.getByRole("button", { name: "Save and quit" }).click();
  await expect(page).toHaveURL(/\/work-orders$/);
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem("sjs-demo-schema:work-order")))!);
  expect(hintsOf(stored)).toEqual({ ...shipped, "(survey)": edited });
});
