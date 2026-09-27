import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { features } from "../src/features";
import { HOW_BUILT_TEXT } from "../src/lib/how-built";
import {
  HOW_CONTENT_DIR,
  howFileName,
  otherEditionHowHref,
  parseFrontMatter,
} from "../src/lib/how-content";
import { howHref } from "../src/lib/routes";
import { DEMO_NAME, DOCK_LABELS, PAGE_ACTIONS } from "../src/lib/site";
import { TITLE_TEMPLATE } from "../src/lib/metadata";
import { navPages, type NavPage } from "../src/schemas/navigation";

/**
 * The explainers in a browser: `/x/how` for every example.
 *
 * What is *said* on them is `how-integrity.spec.ts`'s business, and it needs no
 * browser. This is about the routes and the links between them: the dock's
 * "How this page is built" is a plain link to the explainer, in this tab, on
 * every example page; the explainer links back to its example in this tab and
 * out to the root index; and the MIT edition shows a Full-only block as a link
 * across rather than a gap.
 */

const ROOT = path.join(__dirname, "..");

function howSource(nav: NavPage): string {
  return readFileSync(path.join(ROOT, HOW_CONTENT_DIR, howFileName(nav.path)), "utf8");
}

function summaryOf(nav: NavPage): string {
  return parseFrontMatter(howSource(nav)).data.summary;
}

/** The text of the first quoted block in a file — what the page must be showing. */
function firstQuote(nav: NavPage): string | undefined {
  const lines = howSource(nav).replace(/\r\n/g, "\n").split("\n");
  for (const [index, line] of lines.entries()) {
    if (!/^```.*\b(definition|file)=/.test(line)) continue;
    const end = lines.indexOf("```", index + 1);
    if (end > index + 1) return lines.slice(index + 1, end).join("\n");
  }
  return undefined;
}

function expectedTitle(label: string): string {
  return TITLE_TEMPLATE.replace("%s", `${label} — how it's built`);
}

function dockOf(page: Page) {
  return page.getByRole("toolbar", { name: DOCK_LABELS.toolbar });
}

for (const nav of navPages) {
  test(`${howHref(nav.path)} explains ${nav.path}`, async ({ page }) => {
    // The dock links the explainer straight, in this tab, on every example.
    await page.goto(nav.path);
    const link = dockOf(page).getByRole("link", { name: PAGE_ACTIONS.howBuilt });
    await expect(link).toHaveAttribute("href", howHref(nav.path));
    await expect(link).not.toHaveAttribute("target", /.*/);
    await link.click();

    await expect(page).toHaveURL(new RegExp(`${howHref(nav.path)}$`));
    await expect(page).toHaveTitle(expectedTitle(nav.label));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `${nav.label} — how it's built`,
    );
    await expect(page.getByText(summaryOf(nav))).toBeVisible();

    // An explainer is not an example: no dock, and so no "Source of this page",
    // whose route file here is three lines.
    await expect(dockOf(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: PAGE_ACTIONS.source })).toHaveCount(0);
    // The demo's own header, linking the root index.
    await expect(page.getByRole("banner").getByRole("link", { name: DEMO_NAME })).toHaveAttribute("href", "/");

    // A quoted block is on the page, with the text the file writes out.
    const quote = firstQuote(nav);
    expect(quote, `${nav.path} quotes nothing`).toBeTruthy();
    await expect(page.locator("main pre").filter({ hasText: quote!.split("\n")[0] }).first()).toBeVisible();

    // A block this edition does not ship is a link to the same explainer on the
    // other host — asserted, never requested.
    if (howSource(nav).includes(`<!-- edition: ${features.edition === "mit" ? "full" : "mit"} -->`)) {
      await expect(
        page.locator(`main a[href="${otherEditionHowHref(nav.path)}"]`).first(),
      ).toBeVisible();
    }

    // At the foot, beside previous and next: the way out to every example.
    await expect(
      page.getByRole("navigation", { name: "More examples" }).getByRole("link", {
        name: HOW_BUILT_TEXT.allExamples,
      }),
    ).toHaveAttribute("href", "/");

    // And back to the example it explains, in this tab.
    const open = page.locator("main header").first().getByRole("link", { name: HOW_BUILT_TEXT.openExample });
    await expect(open).toHaveAttribute("href", nav.path);
    await expect(open).not.toHaveAttribute("target", /.*/);
    await open.click();
    await expect(page).toHaveURL(new RegExp(`${nav.path}$`));
  });
}

test("a record's URL links its page's explainer", async ({ page }) => {
  await page.goto("/leads/LEAD-0001");
  const link = dockOf(page).getByRole("link", { name: PAGE_ACTIONS.howBuilt });
  await expect(link).toHaveAttribute("href", howHref("/leads"));
  await link.click();
  await expect(page).toHaveURL(/\/leads\/how$/);
});

test("/how, the old index of the explainers, lands on the root index", async ({ page }) => {
  await page.goto("/how");
  await expect(page).toHaveURL(/\/$/);
  for (const nav of navPages) {
    await expect(page.locator(`[data-example="${nav.id}"]`).getByRole("link", { name: HOW_BUILT_TEXT.howBuilt })).toHaveAttribute(
      "href",
      howHref(nav.path),
    );
  }
});
