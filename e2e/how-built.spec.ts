import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { features } from "../src/features";
import { HOW_BUILT_TEXT } from "../src/lib/how-built";
import {
  HOW_CONTENT_DIR,
  howFileName,
  otherEditionHowHref,
  parseFrontMatter,
} from "../src/lib/how-content";
import { HOW_INDEX, howHref, otherEditionHref } from "../src/lib/routes";
import { PAGE_ACTIONS } from "../src/lib/site";
import { TITLE_TEMPLATE } from "../src/lib/metadata";
import { allNavPages, navPages, opensInNewTab, type NavPage } from "../src/schemas/navigation";

/**
 * The explainers in a browser: `/x/how` for every example this edition ships,
 * and `/how` that lists them.
 *
 * What is *said* on them is `how-integrity.spec.ts`'s business, and it needs no
 * browser. This is about the routes, the chrome and the links between them — in
 * particular that the top bar's control is a plain link to the explainer now,
 * that no drawer exists anywhere any more, and that the MIT edition shows a
 * Full-only block as a link across rather than a gap.
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

for (const nav of navPages) {
  test(`${howHref(nav.path)} explains ${nav.path}`, async ({ page }) => {
    if (nav.layout === "shell") {
      // The top bar links the explainer straight, in this tab. No drawer.
      await page.goto(nav.path);
      const link = page.getByRole("banner").getByRole("link", { name: PAGE_ACTIONS.howBuilt });
      await expect(link).toHaveAttribute("href", howHref(nav.path));
      await expect(link).not.toHaveAttribute("target", /.*/);
      // And nothing about every *other* page: that is the explainer's link.
      await expect(
        page.getByRole("banner").getByRole("link", { name: PAGE_ACTIONS.howIndex }),
      ).toHaveCount(0);
      await link.click();
    } else {
      // An embedded demo wears no chrome: its dock links the explainer instead.
      await page.goto(nav.path);
      const dock = page.getByRole("toolbar", { name: "Embedded demo tools" });
      const link = dock.getByRole("link", { name: PAGE_ACTIONS.howBuilt });
      await expect(link).toHaveAttribute("href", howHref(nav.path));
      await expect(link).toHaveAttribute("target", "_blank");
      await page.goto(howHref(nav.path));
    }

    await expect(page).toHaveURL(new RegExp(`${howHref(nav.path)}$`));
    await expect(page).toHaveTitle(expectedTitle(nav.label));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `${nav.label} — how it's built`,
    );
    await expect(page.getByText(summaryOf(nav))).toBeVisible();

    // There is no drawer anywhere any more, and nothing left in the top bar to
    // open: this page is where the words are.
    await expect(page.getByRole("complementary", { name: PAGE_ACTIONS.howBuilt })).toHaveCount(0);
    await expect(
      page.getByRole("banner").getByRole("link", { name: PAGE_ACTIONS.howBuilt }),
    ).toHaveCount(0);
    // And no "Source of this page": its route file is three lines.
    await expect(page.getByRole("link", { name: PAGE_ACTIONS.source })).toHaveCount(0);
    // The way out to every other example is the top bar's, here as everywhere.
    await expect(
      page.getByRole("banner").getByRole("link", { name: PAGE_ACTIONS.howIndex }),
    ).toHaveAttribute("href", HOW_INDEX);

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

    // The header carries the one way back, and nothing else: the index is the
    // top bar's, beside "How this page is built" on every page of the shell.
    const header = page.locator("main header").first();
    const open = header.getByRole("link", { name: HOW_BUILT_TEXT.openExample });
    await expect(open).toHaveAttribute("href", nav.path);
    await expect(header.getByRole("link", { name: HOW_BUILT_TEXT.allExamples })).toHaveCount(0);
    // It is still at the foot of a long page, beside previous and next.
    await expect(
      page.getByRole("navigation", { name: "More examples" }).getByRole("link", {
        name: HOW_BUILT_TEXT.allExamples,
      }),
    ).toHaveAttribute("href", HOW_INDEX);

    // And back to the example it explains.
    if (opensInNewTab(nav)) {
      await expect(open).toHaveAttribute("target", "_blank");
    } else {
      await open.click();
      await expect(page).toHaveURL(new RegExp(`${nav.path}$`));
    }
  });
}

test("a record's URL links its page's explainer", async ({ page }) => {
  await page.goto("/leads/LEAD-0001");
  const link = page.getByRole("banner").getByRole("link", { name: PAGE_ACTIONS.howBuilt });
  await expect(link).toHaveAttribute("href", howHref("/leads"));
  await link.click();
  await expect(page).toHaveURL(/\/leads\/how$/);
});

test("/how lists every example, and every local link on it answers 200", async ({ page, request }) => {
  const response = await page.goto(HOW_INDEX);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(TITLE_TEMPLATE.replace("%s", "How it's built — every example"));

  for (const nav of allNavPages) {
    await expect(page.locator(`[data-example="${nav.id}"]`), nav.id).toBeVisible();
  }

  // Every link that stays on this host, followed for real.
  const hrefs = await page.locator("main a").evaluateAll((links) =>
    links.map((link) => link.getAttribute("href") ?? "").filter((href) => href.startsWith("/")),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of [...new Set(hrefs)]) {
    const answer = await request.get(href);
    expect(answer.status(), href).toBe(200);
  }

  // The sidebar gained no row for any of this, and the top bar does not offer
  // this page a link to itself.
  const sidebar = page.getByRole("navigation", { name: "Primary" });
  await expect(sidebar.locator(`a[href="${HOW_INDEX}"]`)).toHaveCount(0);
  await expect(
    page.getByRole("banner").getByRole("link", { name: PAGE_ACTIONS.howIndex }),
  ).toHaveCount(0);
});

test.describe("in the MIT edition", () => {
  test.skip(features.edition !== "mit", "About what this edition does not ship");

  test("MySurveys has no page and no explainer, and is linked across instead", async ({ request, page }) => {
    for (const route of ["/mysurveys", howHref("/mysurveys")]) {
      const answer = await request.get(route);
      expect(answer.status(), route).toBe(404);
    }

    await page.goto(HOW_INDEX);
    const card = page.locator('[data-example="mySurveys"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText(HOW_BUILT_TEXT.otherEdition);
    // The href, never a request: the other host is not this test's business.
    await expect(card.getByRole("link", { name: new RegExp(HOW_BUILT_TEXT.readHow) })).toHaveAttribute(
      "href",
      otherEditionHref(features.brand.otherEdition.baseUrl, howHref("/mysurveys")),
    );
  });
});
