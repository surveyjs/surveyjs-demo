import { test, expect } from "@playwright/test";
import { features } from "../src/features";
import { loadExamples } from "../src/examples/load";
import { MENU_LIMIT, menuExamples, problemHref, runLink, visibleExamples } from "../src/examples/entries";
import type { ExampleEntry } from "../src/examples/types";
import { HOW_BUILT_TEXT } from "../src/lib/how-built";
import { howHref } from "../src/lib/routes";
import { navPages } from "../src/schemas/navigation";

/**
 * `/`, the team's index of every example: a card per visible manifest entry,
 * `noindex`, and canonical links resolved exactly as `src/lib/metadata.ts`
 * resolves them — computed here from the environment the server was started
 * with, which Playwright's `webServer` inherits.
 */

test("a card per visible example, with its links", async ({ page }) => {
  const entries = visibleExamples((await loadExamples()).entries);
  await page.goto("/");
  const cards = page.locator("[data-example]");
  await expect(cards).toHaveCount(entries.length);

  for (const entry of entries) {
    const card = page.locator(`[data-example="${entry.id}"]`);
    await expect(card.getByRole("heading", { level: 2 })).toHaveText(entry.name);
    await expect(card).toContainText(entry.problem);

    const run = runLink(entry, features.edition);
    const open = card.getByRole("link", { name: /^Open/ });
    await expect(open).toHaveAttribute("href", run.href);
    if (run.external) await expect(open).toHaveAttribute("target", "_blank");
    else await expect(open).not.toHaveAttribute("target", /.*/);

    // The explainer only for a page this app has.
    const page_ = navPages.find((item) => item.id === entry.id);
    const how = card.getByRole("link", { name: HOW_BUILT_TEXT.howBuilt });
    if (page_) await expect(how).toHaveAttribute("href", howHref(page_.path));
    else await expect(how).toHaveCount(0);

    // The problem links the use-cases page only once it has a section for it.
    const useCase = problemHref(entry);
    const problemLink = card.locator('a[href^="https://surveyjs.io/use-cases"]');
    if (useCase) await expect(problemLink).toHaveAttribute("href", useCase);
    else await expect(problemLink).toHaveCount(0);
  }

  // Starter and Definition are listed here though the dock's menu leaves them out.
  await expect(page.locator('[data-example="starter"]')).toBeVisible();
  await expect(page.locator('[data-example="definition"]')).toBeVisible();
});

test("is not indexed, and is canonical where every page is", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const canonical = (process.env.NEXT_PUBLIC_CANONICAL_URL || site).replace(/\/+$/, "");
  // Next.js writes the root's own URL without its trailing slash.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);

  // And an example page, which search engines may index, points the same way.
  await page.goto("/leads");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${canonical}/leads`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `${canonical}/leads`);
});

test.describe("the visibility rule", () => {
  // The server's `NEXT_PUBLIC_SHOW_UNREADY` is fixed for a run, so the rule the
  // index and the menu share is checked through its helpers.
  const entry = (id: string, extra: Partial<ExampleEntry> = {}): ExampleEntry => ({
    id,
    name: id,
    problem: `${id} problem`,
    url: `https://${id}.example.com/`,
    ready: true,
    related: [],
    ...extra,
  });

  test("hides an entry that is not ready, unless unready ones are shown", () => {
    const entries = [entry("a"), entry("b", { ready: false })];
    expect(visibleExamples(entries, false).map((item) => item.id)).toEqual(["a"]);
    expect(visibleExamples(entries, true).map((item) => item.id)).toEqual(["a", "b"]);
    expect(menuExamples(entries, false).map((item) => item.id)).toEqual(["a"]);
  });

  test("the index lists what the menu leaves out and has no cap; the menu stops at ten", () => {
    const entries = [
      entry("hidden", { inMenu: false }),
      ...Array.from({ length: MENU_LIMIT + 2 }, (_, index) => entry(`e${index}`)),
    ];
    expect(visibleExamples(entries, false)).toHaveLength(MENU_LIMIT + 3);
    const menu = menuExamples(entries, false);
    expect(menu).toHaveLength(MENU_LIMIT);
    expect(menu.map((item) => item.id)).not.toContain("hidden");
  });
});
