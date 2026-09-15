import { test, expect } from "@playwright/test";
import { features } from "../src/features";

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

test("a personalized form is previewed for the demo's first preset user", async ({
  page,
}) => {
  test.slow();
  await page.goto(CLINIC);
  await waitForEditor(page);

  await expect(page.getByText("Rendered for Maria Delgado")).toBeVisible();
  await expect(page.getByText("Welcome back, Maria").first()).toBeVisible({
    timeout: 15_000,
  });
});

test("a definition saved here is what the embedded site renders", async ({ page }) => {
  test.slow();
  await page.goto(CLINIC);
  await waitForEditor(page);

  await setDefinition(page, {
    title: "Saved from the editor",
    elements: [
      { type: "text", name: "q1", title: "Renamed for {user.preferredName}" },
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

  // The server keeps serving the definition that ships with the template.
  const response = await page.reload();
  expect(await response!.text()).not.toContain("Renamed for");
  await expect(page.locator("#request")).toContainText("Renamed for Maria");

  await page.goto(CLINIC);
  await waitForEditor(page);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.goto("/embedded/clinic");
  await expect(page.locator("#request")).toContainText("Welcome back, Maria");
});

/**
 * Every definition that ships is clean, and the linter is told about the one
 * variable the demos set at runtime — otherwise the personalized forms would
 * report dozens of unknown references and look broken to a reviewer.
 */
for (const id of [
  "checkout",
  "insurance-claim",
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
