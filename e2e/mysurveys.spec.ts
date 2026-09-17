import { test, expect } from "@playwright/test";
import { features } from "../src/features";
import {
  MYSURVEYS_COPY,
  MYSURVEYS_FRAME_TEXT,
  MYSURVEYS_PATHS,
  MYSURVEYS_SCREENSHOTS,
} from "../src/lib/mysurveys";
import { EXTERNAL_URLS, SITE_LINKS } from "../src/lib/site";

/**
 * `/mysurveys` shows the hosted form-management application before sending
 * anyone to its login screen. The code is shared, and the page is the full
 * edition's: its row is `edition: "full"`, so the MIT edition has neither the row
 * nor the route. This spec runs in both and says which is which.
 */

const FULL = features.edition === "full";

test.describe("in the full edition", () => {
  test.skip(!FULL, "the MySurveys page is the full edition's");

  test("the page renders its heading, four screenshots and three paths", async ({ page }) => {
    const response = await page.goto("/mysurveys");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("MySurveys");
    await expect(page.getByText(MYSURVEYS_COPY.description)).toBeVisible();
    // A page about an application, not a form: no editor button, no survey.
    await expect(page.getByRole("link", { name: features.designer.label })).toHaveCount(0);
    await expect(page.locator(".sd-root-modern")).toHaveCount(0);

    const figures = page.locator("figure[data-screenshot]");
    await expect(figures).toHaveCount(MYSURVEYS_SCREENSHOTS.length);
    for (const [index, shot] of MYSURVEYS_SCREENSHOTS.entries()) {
      const figure = figures.nth(index);
      await expect(figure.locator("figcaption")).toContainText(shot.caption);
      // A capture, or a frame that says it is one: never both, never neither.
      const image = figure.locator("img");
      const frame = figure.locator("[data-placeholder]");
      expect((await image.count()) + (await frame.count())).toBe(1);
      if (await frame.count()) await expect(frame).toContainText(MYSURVEYS_FRAME_TEXT);
    }
  });

  test("the three paths link out, in a new tab, to the site constants", async ({ page }) => {
    await page.goto("/mysurveys");

    const expected = [
      EXTERNAL_URLS.mySurveys,
      EXTERNAL_URLS.createFreeSurvey,
      SITE_LINKS.find((link) => link.id === "serverIntegration")!.href,
    ];
    expect(MYSURVEYS_PATHS.map((item) => item.href)).toEqual(expected);

    for (const item of MYSURVEYS_PATHS) {
      const card = page.locator(`[data-path="${item.id}"]`);
      await expect(card.getByRole("heading", { level: 2 })).toHaveText(item.heading);
      await expect(card).toContainText(item.copy);
      const link = card.getByRole("link", { name: item.button });
      await expect(link).toHaveAttribute("href", item.href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noreferrer");
    }
    // Nothing of MySurveys is embedded.
    await expect(page.locator("iframe")).toHaveCount(0);
  });

  test("the sidebar row opens the page in the same tab and is marked active", async ({ page }) => {
    await page.goto("/leads");
    const sidebar = page.getByRole("navigation", { name: "Primary" });
    const row = sidebar.getByRole("link", { name: /^MySurveys/ });
    await expect(row).toHaveAttribute("href", "/mysurveys");
    await expect(row).not.toHaveAttribute("target", "_blank");
    await expect(row).not.toContainText("↗");

    await row.click();
    await expect(page).toHaveURL(/\/mysurveys$/);
    await expect(sidebar.getByRole("link", { name: /^MySurveys/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

test.describe("in the MIT edition", () => {
  test.skip(FULL, "the full edition has the page");

  test("there is no row and no route", async ({ page }) => {
    const response = await page.goto("/mysurveys");
    expect(response?.status()).toBe(404);

    await page.goto("/leads");
    const sidebar = page.getByRole("navigation", { name: "Primary" });
    await expect(sidebar.getByRole("link", { name: /^MySurveys/ })).toHaveCount(0);
    await expect(sidebar.getByRole("group", { name: "Your users' forms" })).toHaveCount(0);
  });
});
