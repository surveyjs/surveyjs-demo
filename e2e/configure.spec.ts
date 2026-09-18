import { test, expect } from "@playwright/test";
import { features } from "../src/features";
import { getVariablePresets } from "../src/schemas/variables";
import { checkoutJson } from "../src/schemas/checkout";
import { startSession } from "./session";

test.skip(features.edition !== "mit", "the JSON workbench is the MIT edition's editor");

/**
 * `/configure` is the editor every form opens in: the definition on the left,
 * the form it produces on the right, and nothing else on the page — no sidebar,
 * no list of the other forms. `?form=` says which one.
 */

const CLINIC = "/configure?form=clinic-visit";

async function waitForEditor(page: import("@playwright/test").Page) {
  // Monaco is a heavy dynamic import; under parallel workers it needs longer
  // than the default expect timeout.
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
}

async function setDefinition(page: import("@playwright/test").Page, json: unknown) {
  await page.evaluate((source) => {
    const monaco = (window as unknown as { monaco: typeof import("monaco-editor") })
      .monaco;
    monaco.editor.getModels()[0].setValue(source);
  }, JSON.stringify(json, null, 2));
}

test("the editor opens on one form, with no chrome around it", async ({ page }) => {
  test.slow();
  await page.goto("/configure?form=checkout");
  await waitForEditor(page);

  // No sidebar, and no way to wander into another form from here.
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/starter");
  await expect(page.getByText("Checkout — form JSON")).toBeVisible();

  await setDefinition(page, {
    title: "Edited here",
    elements: [{ type: "text", name: "q1", title: "A brand new question" }],
  });
  await expect(page.getByText("A brand new question").first()).toBeVisible({
    timeout: 15_000,
  });
});

test("a personalized form is previewed for its first variable preset", async ({ page }) => {
  test.slow();
  await page.goto(CLINIC);
  await waitForEditor(page);

  await expect(page.getByLabel("Variable preset")).toHaveValue("Maria Delgado");
  await expect(page.getByText("Welcome back, Maria").first()).toBeVisible({
    timeout: 15_000,
  });
});

test("the preset selector re-renders the preview, and None renders it for nobody", async ({
  page,
}) => {
  test.slow();
  await page.goto("/configure?form=customer-satisfaction");
  await waitForEditor(page);

  const selector = page.getByLabel("Variable preset");
  const presets = getVariablePresets("customer-satisfaction")!.presets!;
  await expect(selector).toHaveValue(presets[0].name);
  await expect(page.getByTestId("preset-description")).toHaveText(presets[0].description!);
  await expect(page.getByText("Hi Alex, how are we doing?").first()).toBeVisible({
    timeout: 15_000,
  });

  await selector.selectOption(presets[1].name);
  await expect(page.getByText("Hi Priya, how are we doing?").first()).toBeVisible();

  await selector.selectOption({ label: "None" });
  await expect(page.getByText(/^Hi .*, how are we doing\?$/).first()).toBeVisible();
  for (const preset of presets) {
    await expect(page.getByText(`Hi ${preset.variables.user_firstName},`)).toHaveCount(0);
  }
});

test("a definition saved here is what the embedded site renders", async ({ page }) => {
  test.slow();
  await page.goto(CLINIC);
  await waitForEditor(page);

  await setDefinition(page, {
    title: "Saved from the editor",
    elements: [
      { type: "text", name: "q1", title: "Renamed for {user_preferredName}" },
    ],
  });
  await expect(page.getByText("Renamed for Maria").first()).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "View Result" }).click();
  await expect(page).toHaveURL(/\/embedded\/clinic$/);

  // The host site is untouched — it is the survey inside it that came from the
  // editor, piping the same account the editor was showing.
  await expect(page.locator("#request")).toContainText("Renamed for Maria", {
    timeout: 15_000,
  });
  await expect(page.getByText("Ridgeline Family Health").first()).toBeVisible();

  // The server renders what this visitor stored, so the reloaded HTML has it.
  const response = await page.reload();
  expect(await response!.text()).toContain("Renamed for");
  await expect(page.locator("#request")).toContainText("Renamed for Maria");

  await page.goto(CLINIC);
  await waitForEditor(page);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.goto("/embedded/clinic");
  // Back to the definition that ships — which, for Maria, is the Spanish one:
  // her chart asks for it, and the page reads the chart before it reads anything
  // the visitor stored.
  await expect(page.locator("#request")).toContainText("Qué gusto verle de nuevo");
});

/**
 * Every definition that ships is clean, and the linter is given the form's
 * variable presets — otherwise the personalized forms would report dozens of
 * unknown references and look broken to a reviewer. The presets themselves are
 * checked by the same run (rule `variable/preset`).
 */
for (const id of [
  "checkout",
  "work-order",
  "leads",
  "customer-satisfaction",
  "encounter-note",
  "clinic-visit",
]) {
  test(`the ${id} definition passes static analysis`, async ({ page }) => {
    test.slow();
    await page.goto(`/configure?form=${id}`);
    await waitForEditor(page);
    await expect(
      page.getByText("Static analysis: all checks passed", { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
  });
}

/**
 * "Try breaking it" and then Save is the demo of the whole claim: the rules that
 * flag a broken expression while somebody types are the rules that refuse it at
 * the API. The editor keeps the author's work and says why, and the definition
 * on the server is still the last good one.
 */
test("a definition the linter refuses is not saved, and the editor says so", async ({ page }) => {
  test.slow();
  await page.goto("/configure?form=checkout");
  await waitForEditor(page);
  await startSession(page.request);

  const broken = structuredClone(checkoutJson) as Record<string, unknown>;
  ((broken.pages as { elements: Record<string, unknown>[] }[])[0].elements[0]).visibleIf =
    "{noSuchQuestion} = 1";
  await setDefinition(page, broken);

  await page.getByRole("button", { name: "Save and quit" }).click();
  const line = page.getByText(/^Not saved:/);
  await expect(line).toBeVisible({ timeout: 15_000 });
  // The sentence names the rule and the element, so the author knows what to fix
  // without reading the JSON back.
  await expect(line).toContainText("noSuchQuestion");
  // Still here: a refused save does not navigate.
  await expect(page).toHaveURL(/\/configure\?form=checkout$/);

  // And nothing was stored: a reload opens on the definition that ships.
  const stored = await page.request.get("/api/storage/definitions/checkout");
  expect((await stored.json()).json).toEqual(checkoutJson);
  await page.reload();
  await waitForEditor(page);
  await expect(page.getByText(/^Not saved:/)).toHaveCount(0);
});
