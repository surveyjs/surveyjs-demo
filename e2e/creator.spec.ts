import { test, expect, type Page } from "@playwright/test";
import { checkoutJson } from "../src/schemas/checkout";
import { getVariablePresets } from "../src/schemas/variables";

/**
 * `/configure` is the designer every form opens in: Survey Creator, full page,
 * on one form — no sidebar, no list of the other forms. `?form=` says which one.
 *
 * The designer is a browser application loaded on the client, so these tests are
 * deliberately about the page around it and the storage seam under it; what the
 * Creator itself does with a definition is the Creator's own test suite.
 */

async function waitForCreator(page: Page) {
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

test("Preview opens on the form's first variable preset, and the selector lists them all", async ({
  page,
}) => {
  test.slow();
  const presets = getVariablePresets("clinic-visit")!.presets!;
  await page.goto("/configure?form=clinic-visit");
  await waitForCreator(page);
  await expect(page.getByText(`Previewing as ${presets[0].name}`)).toBeVisible();

  await page.locator(".svc-tabbed-menu-item", { hasText: "Preview" }).first().click();
  const selector = page.locator(".svc-variable-preset-selector");
  // The title only: the action also holds its (hidden) popup list.
  const selected = selector.locator(".sd-action__title");
  await expect(selected).toHaveText(`Variables: ${presets[0].name}`);
  await expect(page.getByText("Welcome back, Maria").first()).toBeVisible();

  await selector.getByRole("button").first().click();
  const items = page.getByRole("menuitemradio");
  await expect(items).toHaveText(presets.map((preset) => preset.name));
  await expect(items.first()).toHaveAttribute("aria-checked", "true");
  await items.nth(1).click();
  await expect(selected).toHaveText(`Variables: ${presets[1].name}`);
  // The header follows the Creator's own event.
  await expect(page.getByText(`Previewing as ${presets[1].name}`)).toBeVisible();

  // The built-in preset editor opens; what it does is the Creator's own suite.
  await page.locator(".svc-variable-presets-view").getByRole("button").click();
  await expect(page.getByText("Variable presets").first()).toBeVisible();
});

test("the condition editor offers a declared variable with its own value editor", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/configure?form=leads");
  await waitForCreator(page);
  await page.locator(".svc-tabbed-menu-item", { hasText: "Logic" }).first().click();

  // budgetAmount: visibleIf "{budgetConfirmed} = true and {user_role} = 'manager'".
  const rule = page.getByText("make question 'budgetAmount' visible").first().locator("xpath=ancestor::tr[1]");
  await rule.getByTitle("Show Details").click();
  const names = page.locator('[data-name="questionName"]');
  await expect(names.nth(1)).toContainText("user_role");

  // The definition's own question, titled "Role", with its choices: a dropdown,
  // not a free-text box.
  const value = page.locator('[data-name="questionValue"]').nth(1);
  await expect(value.getByRole("combobox", { name: "Role" })).toBeAttached();
  await value.getByRole("button", { name: "Select" }).click();
  await expect(page.getByRole("option")).toHaveText(["sales", "manager"]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("option")).toHaveCount(0);

  // And every declared variable is in the list of what a condition can read.
  await names.nth(1).getByRole("combobox").click();
  for (const variable of ["user_id", "user_name", "user_role", "user_currency"]) {
    await expect(page.getByRole("option", { name: variable, exact: true })).toBeVisible();
  }
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
  // Read back through the storage route: `page.request` shares the page's cookie,
  // so it is this visitor's own definition.
  const { json: stored } = await (await page.request.get("/api/storage/definitions/work-order")).json();
  expect(hintsOf(stored)).toEqual({ ...shipped, "(survey)": edited });
});

/**
 * A refused save, announced through Creator's own error notification.
 *
 * `PUT /api/storage/definitions/:schema` lints the definition and runs the
 * form's test suite before it stores anything, so some autosaves are refused on
 * purpose. What this edition owes an author is the reason, once, and a header
 * that does not claim the work was saved.
 *
 * The request is rewritten on the way out rather than typed into the JSON tab:
 * that tab is a React-controlled textarea which does not react to synthetic
 * input, and what is under test here is how a refusal is announced, not how a
 * definition is typed. The refusal itself is the real route's — the real
 * linter, the real suite, the real sentence from `messages.ts`.
 */
test.describe("a save the server refuses", () => {
  /** Lints clean, and fails two of the four checkout tests: the card panel never shows. */
  const failsItsSuite = () => {
    const json = structuredClone(checkoutJson) as Record<string, unknown>;
    const walk = (node: unknown, visit: (element: Record<string, unknown>) => void) => {
      if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
      if (!node || typeof node !== "object") return;
      visit(node as Record<string, unknown>);
      Object.values(node).forEach((value) => walk(value, visit));
    };
    walk(json, (element) => {
      if (element.name === "cardPanel") element.visibleIf = "{paymentMethod} = 'neither'";
    });
    return json;
  };

  /** Every PUT of a definition leaves with `json` instead of what the Creator holds. */
  async function sendInstead(page: Page, json: unknown) {
    await page.route("**/api/storage/definitions/checkout", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      await route.continue({ postData: JSON.stringify({ json }) });
    });
  }

  /** One edit in the property grid, which the Creator autosaves about a second later. */
  async function editTheTitle(page: Page, text: string) {
    await page
      .locator('[data-sv-drop-target-survey-element="email"] .svc-question__content')
      .first()
      .click({ position: { x: 60, y: 8 } });
    const title = page
      .locator('.svc-side-bar [data-name="title"] textarea, .svc-side-bar [data-name="title"] input')
      .first();
    await title.click();
    await page.keyboard.type(text);
  }

  const errorToast = (page: Page) => page.locator(".svc-notifier--error.svc-notifier--shown");
  /** The persistent line under the header: the same sentence, still there once the toast has gone. */
  const hostLine = (page: Page) => page.locator("header + p");

  test("a definition the linter refuses is announced once, and is not stored", async ({ page }) => {
    test.slow();
    await sendInstead(page, {
      pages: [{ name: "p", elements: [{ type: "text", name: "a", visibleIf: "{" }] }],
    });
    await page.goto("/configure?form=checkout");
    await waitForCreator(page);

    await editTheTitle(page, "A");
    // Creator's own toast, carrying the server's sentence rather than its
    // generic "Editor content is not saved".
    await expect(errorToast(page)).toBeVisible({ timeout: 30_000 });
    await expect(errorToast(page)).toContainText("Not saved:");
    await expect(errorToast(page)).toContainText("cannot be parsed");

    // The persistent line under the header says the same thing, and the header
    // does not claim the work was saved.
    await expect(hostLine(page)).toHaveText(/^Not saved: /);
    await expect(page.locator("header p").first()).toContainText("Not saved");

    // One toast per error, not one per autosave: the next refused save carries
    // the same sentence and is not announced again.
    await expect(errorToast(page)).toBeHidden({ timeout: 15_000 });
    await editTheTitle(page, "B");
    await expect(errorToast(page)).toBeHidden({ timeout: 6_000 });
    // The line is still there, which is what keeps the refusal on screen.
    await expect(hostLine(page)).toHaveText(/^Not saved: /);

    // Nothing was stored: the definition is still the one that ships.
    await page.unroute("**/api/storage/definitions/checkout");
    const stored = await page.request.get("/api/storage/definitions/checkout");
    expect((await stored.json()).json).toEqual(checkoutJson);
  });

  test("a definition that fails its suite is announced with the test's name", async ({ page }) => {
    test.slow();
    await sendInstead(page, failsItsSuite());
    await page.goto("/configure?form=checkout");
    await waitForCreator(page);

    await editTheTitle(page, "A");
    await expect(errorToast(page)).toBeVisible({ timeout: 30_000 });
    await expect(errorToast(page)).toContainText("Card details show for a card");
  });

  test("once a save goes through, the line clears and the definition is stored", async ({ page }) => {
    test.slow();
    await sendInstead(page, {
      pages: [{ name: "p", elements: [{ type: "text", name: "a", visibleIf: "{" }] }],
    });
    await page.goto("/configure?form=checkout");
    await waitForCreator(page);
    await editTheTitle(page, "A");
    await expect(hostLine(page)).toHaveText(/^Not saved: /, { timeout: 30_000 });

    // The author fixes it: from here the Creator's own definition goes out.
    await page.unroute("**/api/storage/definitions/checkout");
    await editTheTitle(page, "B");
    await expect(hostLine(page)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator("header p").first()).toContainText("Saved as you edit");

    const stored = await page.request.get("/api/storage/definitions/checkout");
    const { json } = (await stored.json()) as { json: Record<string, unknown> };
    expect(JSON.stringify(json)).toContain("Email addressAB");
  });
});
