import { test, expect } from "@playwright/test";
import { features } from "../src/features";

test.skip(features.edition !== "mit", "the JSON workbench is the MIT edition's editor");

const CONFIGURE = "/configure?form=checkout";

test("the status bar reports a clean schema and expands to the checks", async ({
  page,
}) => {
  test.slow();
  await page.goto(CONFIGURE);
  await expect(page.locator(".monaco-editor").first()).toBeVisible({
    timeout: 30_000,
  });

  await expect(page.getByText("Static analysis: all checks passed", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  const disclosure = page.getByRole("button", { name: /View checks/ });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Checks performed")).toBeVisible();
  await expect(page.getByText("Try breaking it")).toBeVisible();
  // The rule list comes from getRules(), so every rule shows up.
  await expect(page.getByText("reference/unknown").first()).toBeVisible();
});

test("a demo mutation produces a located finding, and Reset clears it", async ({
  page,
}) => {
  test.slow();
  await page.goto(CONFIGURE);
  await expect(page.locator(".monaco-editor").first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Static analysis: all checks passed", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: /View checks/ }).click();
  await page.getByRole("button", { name: "Break an expression" }).click();

  // Findings appear, the bar flips to the failure wording and the panel opens.
  await expect(page.getByText(/^Static analysis: \d+ issues?$/)).toBeVisible({
    timeout: 15_000,
  });
  const finding = page.getByRole("button", { name: /noSuchQuestion/ });
  await expect(finding).toBeVisible();
  // Every finding carries its JSON path and the line it sits on.
  await expect(finding).toContainText(/visibleIf · line \d+/);

  // Clicking the finding scrolls the editor to its line, where Monaco — which only
  // renders the lines in view — paints the gutter marker.
  await finding.click();
  await expect(page.locator(".lint-glyph").first()).toBeVisible();
  await expect(page.locator(".lint-line").first()).toBeVisible();

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("Static analysis: all checks passed", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
});

test("an unparsable document pauses the analysis instead of reporting errors", async ({
  page,
}) => {
  test.slow();
  await page.goto(CONFIGURE);
  await expect(page.locator(".monaco-editor").first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Static analysis: all checks passed", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await page.evaluate(() => {
    const monaco = (window as unknown as { monaco: typeof import("monaco-editor") })
      .monaco;
    monaco.editor.getModels()[0].setValue("{ not json");
  });

  await expect(
    page.getByText("Static analysis: waiting for valid JSON", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^Static analysis: \d+ issues?$/)).toHaveCount(0);
});
