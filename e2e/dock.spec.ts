import { test, expect, type Page } from "@playwright/test";
import { features } from "../src/features";
import { loadExamples } from "../src/examples/load";
import { menuExamples, MENU_LIMIT, problemHref, runLink } from "../src/examples/entries";
import { otherEditionHref } from "../src/lib/routes";
import { DOCK_LABELS, PAGE_ACTIONS } from "../src/lib/site";
import { getNavItem, navPages } from "../src/schemas/navigation";
import { SHORT_CHECKOUT } from "./short-checkout";
import { startSession } from "./session";

/**
 * The one dock, on every example page, in both editions: the "More examples"
 * menu, the edition switch, the "See next" card and the ⋯ that holds what a
 * phone has no room for.
 *
 * The expected menu is read with `loadExamples`, in this process, with the
 * environment the server was started with — so it is the bundled manifest
 * unless a run sets `NEXT_PUBLIC_EXAMPLES_MANIFEST_URL`, and the same either way.
 */

function dockOf(page: Page) {
  return page.getByRole("toolbar", { name: DOCK_LABELS.toolbar });
}

function menuOf(page: Page) {
  return page.getByRole("dialog", { name: DOCK_LABELS.moreExamples });
}

async function openMenu(page: Page) {
  await dockOf(page).getByRole("button", { name: DOCK_LABELS.moreExamples }).click();
  await expect(menuOf(page)).toBeVisible();
  return menuOf(page);
}

test.describe("More examples", () => {
  test("lists the visible manifest entries, at most ten, the current one marked", async ({ page }) => {
    const expected = menuExamples((await loadExamples()).entries);
    expect(expected.length).toBeLessThanOrEqual(MENU_LIMIT);

    await page.goto("/feedback");
    const menu = await openMenu(page);
    const rows = menu.locator("li[data-example]");
    await expect(rows).toHaveCount(expected.length);
    for (const [index, entry] of expected.entries()) {
      await expect(rows.nth(index)).toHaveAttribute("data-example", entry.id);
      await expect(rows.nth(index)).toContainText(entry.name);
    }
    // The heading says whose demo this is, and which edition.
    await expect(menu).toContainText(features.brand.editionLabel);
    // Here, and only here, "Feedback" is the page you are on.
    const current = menu.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(getNavItem("embeddedFeedback").label);
    await expect(menu.getByRole("link", { name: /All use cases/ })).toHaveAttribute(
      "href",
      "https://surveyjs.io/use-cases",
    );
  });

  test("every run link stays on this host and edition, except an example on a host of its own", async ({ page }) => {
    const expected = menuExamples((await loadExamples()).entries);
    await page.goto("/chart");
    const menu = await openMenu(page);

    for (const entry of expected) {
      const link = menu.locator(`li[data-example="${entry.id}"] a`).first();
      const run = runLink(entry, features.edition);
      await expect(link).toHaveAttribute("href", run.href);
      if (entry.id === "healthcare") {
        expect(run.external).toBe(true);
        expect(run.href).toMatch(/^https:\/\//);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toContainText("↗");
      } else {
        expect(run.href.startsWith("/")).toBe(true);
        await expect(link).not.toHaveAttribute("target", /.*/);
      }
    }

    // Each problem opens that example's section of the use-cases page, in a new tab.
    for (const entry of expected) {
      const useCase = problemHref(entry);
      const problem = menu.locator(`li[data-example="${entry.id}"] a[href^="https://surveyjs.io/use-cases"]`);
      if (!useCase) {
        await expect(problem).toHaveCount(0);
        continue;
      }
      await expect(problem).toHaveAttribute("href", useCase);
      await expect(problem).toHaveAttribute("target", "_blank");
      await expect(problem).toContainText(entry.problem);
    }

    // And a row goes there, in this tab.
    await menu.getByRole("link", { name: getNavItem("leads").label, exact: true }).click();
    await expect(page).toHaveURL(/\/leads$/);
    await expect(dockOf(page)).toBeVisible();
  });

  test("closes on Escape and on a click outside, and works from the keyboard", async ({ page }) => {
    await page.goto("/feedback");
    const trigger = dockOf(page).getByRole("button", { name: DOCK_LABELS.moreExamples });

    // Escape closes it and gives focus back to the trigger.
    await openMenu(page);
    await page.keyboard.press("Escape");
    await expect(menuOf(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();

    // A click anywhere else closes it.
    await openMenu(page);
    await page.mouse.click(8, 160);
    await expect(menuOf(page)).toHaveCount(0);

    // Enter opens it, Tab walks its links, Escape comes back.
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = menuOf(page);
    await expect(menu).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(menu.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(menu.getByRole("link").nth(1)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test.describe("the edition switch", () => {
  const { label, baseUrl } = features.brand.otherEdition;
  // Every example page, and a record's own URL: the pathname travels whole.
  const paths = [...navPages.map((item) => item.path), "/leads/LEAD-0001"];

  for (const path of paths) {
    test(`on ${path} it opens the same pathname on the other host, in this tab`, async ({ page }) => {
      await page.goto(path);
      const link = dockOf(page).getByRole("link", { name: `${label} →` });
      await expect(link).toHaveAttribute("href", otherEditionHref(baseUrl, path));
      await expect(link).not.toHaveAttribute("target", /.*/);
    });
  }
});

test.describe("See next", () => {
  const card = (page: Page) => page.getByRole("region", { name: DOCK_LABELS.seeNext });

  test("appears once a /starter is completed, and not again after Dismiss", async ({ page }) => {
    const manifest = await loadExamples();
    const related = manifest.entries.find((entry) => entry.id === "starter")!.related;
    // A short checkout for this visitor, so the form completes in two steps.
    await startSession(page.request);
    expect((await page.request.put("/api/storage/definitions/checkout", { data: { json: SHORT_CHECKOUT } })).status()).toBe(204);

    await page.goto("/starter");
    await expect(card(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Complete" }).click();
    await expect(page.getByText("Thank you. Your response has been submitted.")).toBeVisible();

    await expect(card(page)).toBeVisible();
    for (const id of related) {
      const entry = manifest.entries.find((item) => item.id === id)!;
      await expect(card(page).getByRole("link", { name: entry.name, exact: true })).toBeVisible();
    }
    await card(page).getByRole("button", { name: "Dismiss" }).click();
    await expect(card(page)).toHaveCount(0);

    // A second completion on the same page view does not bring it back.
    await page.getByRole("button", { name: "Edit Response" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    const submitted = page.waitForResponse("**/api/storage/submissions/checkout");
    await page.getByRole("button", { name: "Complete" }).click();
    expect((await submitted).status()).toBe(201);
    await expect(page.getByText("Thank you. Your response has been submitted.")).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  });

  test("appears once a lead is saved", async ({ page }) => {
    await page.goto("/leads");
    await expect(card(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /^Edit / })).toBeVisible();
    const saved = page.waitForResponse(
      (response) => response.url().includes("/api/storage/results/leads/") && response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Save changes" }).first().click();
    expect((await saved).ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /^View / })).toBeVisible();
    await expect(card(page)).toBeVisible();
  });
});

test.describe("at 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const item of navPages) {
    test(`${item.path}: no sideways scroll, and the dock is inside the screen`, async ({ page }) => {
      await page.goto(item.path);
      const dock = dockOf(page);
      await expect(dock).toBeVisible();
      await page.waitForLoadState("networkidle");

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const box = (await dock.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
      // Every control still on the bar is on the screen too.
      for (const control of await dock.locator("a, button").all()) {
        const rect = await control.boundingBox();
        if (!rect || rect.width === 0) continue;
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(390);
      }
      // What never collapses is still on the bar.
      await expect(dock.getByRole("button", { name: DOCK_LABELS.moreExamples })).toBeVisible();
    });
  }

  test("⋯ holds what the bar has no room for", async ({ page }) => {
    await page.goto("/feedback");
    const dock = dockOf(page);
    // On the bar: the menu, the editor link, Login as and ⋯.
    await expect(dock.getByRole("button", { name: DOCK_LABELS.moreExamples })).toBeVisible();
    await expect(dock.getByRole("link", { name: features.designer.label })).toBeVisible();
    await expect(dock.getByRole("button", { name: /^Login as:/ })).toBeVisible();
    for (const name of [PAGE_ACTIONS.source, PAGE_ACTIONS.howBuilt, DOCK_LABELS.prefill, DOCK_LABELS.reset, DOCK_LABELS.editUser]) {
      await expect(dock.getByRole(name === PAGE_ACTIONS.source || name === PAGE_ACTIONS.howBuilt ? "link" : "button", { name, exact: true })).toBeHidden();
    }

    await dock.getByRole("button", { name: DOCK_LABELS.overflow }).click();
    const menu = page.getByRole("menu");
    const expected = [
      PAGE_ACTIONS.source,
      /^Switch to (light|dark) mode$/,
      `${features.brand.otherEdition.label} →`,
      PAGE_ACTIONS.howBuilt,
      ...(features.analyticsHref ? [DOCK_LABELS.analytics] : []),
      ...(features.exportPdf ? [DOCK_LABELS.savePdf] : []),
      DOCK_LABELS.reset,
      DOCK_LABELS.prefill,
      DOCK_LABELS.editUser,
    ];
    const items = menu.getByRole("menuitem");
    await expect(items).toHaveCount(expected.length);
    for (const [index, name] of expected.entries()) {
      await expect(items.nth(index)).toHaveText(typeof name === "string" ? new RegExp(`^${escapeRegExp(name)}`) : name);
    }

    // And an item does what its button does.
    await items.filter({ hasText: DOCK_LABELS.editUser }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
