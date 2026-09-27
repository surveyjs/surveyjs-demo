import { test, expect } from "@playwright/test";
import { DOCK_LABELS } from "../src/lib/site";

/**
 * `/analytics` is the dashboard for one form, on the same `?form=` contract as
 * the designer: SurveyJS Dashboard reads the definition, picks a visualization
 * per question and aggregates the generated responses.
 */

test("the dashboard draws charts for a form's responses", async ({ page }) => {
  test.slow();
  await page.goto("/analytics?form=customer-satisfaction");

  await expect(page.getByText("Satisfaction survey — analytics")).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole("link", { name: "Back" })).toHaveAttribute(
    "href",
    "/embedded/feedback",
  );

  // Chart.js draws into canvases: more than one means the grid was built from
  // the questions rather than from a single hand-written chart.
  const charts = page.locator("canvas");
  await expect(charts.first()).toBeVisible({ timeout: 45_000 });
  expect(await charts.count()).toBeGreaterThan(1);
});

test("the dock carries Save as PDF and Analytics", async ({ page }) => {
  await page.goto("/embedded/feedback");
  const dock = page.getByRole("toolbar", { name: DOCK_LABELS.toolbar });

  await expect(dock.getByRole("button", { name: DOCK_LABELS.savePdf })).toBeVisible();
  await expect(dock.getByRole("link", { name: DOCK_LABELS.analytics })).toHaveAttribute(
    "href",
    "/analytics?form=customer-satisfaction",
  );
});

test("/starter's dock links to the dashboard, and the survey can save a PDF", async ({
  page,
}) => {
  await page.goto("/starter");
  const dock = page.getByRole("toolbar", { name: DOCK_LABELS.toolbar });

  await expect(dock.getByRole("link", { name: DOCK_LABELS.analytics })).toHaveAttribute(
    "href",
    "/analytics?form=checkout",
  );
  // The export sits in the survey's own navigation bar, next to Prefill, and
  // the dock does not repeat it.
  await expect(dock.getByRole("button", { name: DOCK_LABELS.savePdf })).toHaveCount(0);
  await expect(page.getByText("Save as PDF")).toBeVisible();
});
