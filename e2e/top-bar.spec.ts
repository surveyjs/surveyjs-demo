import { test, expect, type Page } from "@playwright/test";
import { features } from "../src/features";
import { navHref, navItems, navPages, opensInNewTab } from "../src/schemas/navigation";
import { otherEditionHref, pageSourcePath } from "../src/lib/routes";
import { DEMO_NAME, PAGE_ACTIONS, SITE_LINKS } from "../src/lib/site";

/**
 * The admin top bar, in both editions. Routes come from `navPages`, so a new
 * page is covered by setting its `layout`.
 */

const shellRoutes = navPages.filter((item) => item.layout === "shell").map((item) => item.path);
const switchName = `${features.brand.otherEdition.label} →`;

test.describe("helpers", () => {
  test("otherEditionHref keeps the host, the base path and the pathname", () => {
    expect(otherEditionHref("http://localhost:3001", "/claims")).toBe("http://localhost:3001/claims");
    expect(otherEditionHref("https://full.example/", "/starter")).toBe("https://full.example/starter");
    expect(otherEditionHref("https://example.com/demos/full", "/claims")).toBe(
      "https://example.com/demos/full/claims",
    );
    expect(otherEditionHref("https://example.com/demos/full//", "/claims")).toBe(
      "https://example.com/demos/full/claims",
    );
  });

  test("pageSourcePath maps a demo route to the file that serves it", () => {
    expect(pageSourcePath("/claims")).toBe("src/app/(shell)/claims/page.tsx");
    expect(pageSourcePath("/embedded/chart")).toBe("src/app/embedded/chart/page.tsx");
    expect(pageSourcePath("/configure")).toBeUndefined();
  });
});

test.describe("layout guard", () => {
  // `layout` only describes the page; the route's folder is what Next.js obeys.
  // This is what keeps the two in step.
  for (const item of navPages) {
    test(`${item.path} wears the ${item.layout} chrome`, async ({ page }) => {
      await page.goto(item.path);
      const sidebar = page.getByRole("navigation", { name: "Primary" });
      if (item.layout === "shell") {
        await expect(sidebar).toBeVisible();
        await expect(page.getByRole("banner")).toContainText(DEMO_NAME);
      } else {
        await expect(sidebar).toHaveCount(0);
        await expect(page.getByText(DEMO_NAME)).toHaveCount(0);
      }
    });
  }

  test("the sidebar opens a row in a new tab exactly when opensInNewTab says so", async ({ page }) => {
    await page.goto("/claims");
    const sidebar = page.getByRole("navigation", { name: "Primary" });
    for (const item of navItems) {
      const link = sidebar.locator(`a[href="${navHref(item)}"]`);
      if (opensInNewTab(item)) {
        await expect(link).toHaveAttribute("target", "_blank");
      } else {
        await expect(link).not.toHaveAttribute("target", /.*/);
      }
    }
  });
});

test.describe("the top bar", () => {
  for (const route of shellRoutes) {
    test(`on ${route}`, async ({ page }) => {
      await page.goto(route);
      const banner = page.getByRole("banner");

      await expect(banner.getByText(DEMO_NAME)).toBeVisible();
      await expect(banner).not.toContainText("shadcn/ui");
      await expect(banner).not.toContainText("Creator");
      await expect(banner.locator('[data-slot="badge"]')).toHaveText(features.brand.editionLabel);

      // The same pathname on the other edition's host, in this tab.
      const editionSwitch = banner.getByRole("link", { name: switchName });
      const switchHref = await editionSwitch.getAttribute("href");
      expect(switchHref).toMatch(/^https?:\/\//);
      expect(switchHref).toBe(otherEditionHref(features.brand.otherEdition.baseUrl, route));
      await expect(editionSwitch).not.toHaveAttribute("target", /.*/);

      for (const link of SITE_LINKS) {
        await expect(banner.getByRole("link", { name: link.label })).toHaveAttribute("target", "_blank");
      }

      const sourceHref = await banner.getByRole("link", { name: PAGE_ACTIONS.source }).getAttribute("href");
      expect(sourceHref?.endsWith(`/blob/main/${pageSourcePath(route)}`)).toBe(true);

      const howBuilt = banner.getByRole("button", { name: PAGE_ACTIONS.howBuilt });
      await expect(howBuilt).toHaveAttribute("aria-pressed", "false");
      await howBuilt.click();
      await expect(howBuilt).toHaveAttribute("aria-pressed", "true");

      // Per-form actions live in the page header, never here.
      await expect(banner.getByRole("link", { name: features.designer.label })).toHaveCount(0);
      await expect(banner.getByRole("link", { name: "View analytics" })).toHaveCount(0);
    });
  }
});

async function expectBannerFits(page: Page) {
  const overflow = await page.evaluate(() => {
    const banner = document.querySelector("header")!;
    return {
      page: document.documentElement.scrollWidth - window.innerWidth,
      banner: banner.scrollWidth - banner.clientWidth,
    };
  });
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.banner).toBeLessThanOrEqual(0);

  const width = page.viewportSize()!.width;
  const controls = page.getByRole("banner").locator("a, button");
  for (let index = 0; index < (await controls.count()); index++) {
    const box = await controls.nth(index).boundingBox();
    if (!box || box.width === 0) continue; // hidden at this width
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
}

test.describe("the top bar at every width", () => {
  const widths = [
    { width: 375, height: 812 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const viewport of widths) {
    test(`${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/claims");
      const banner = page.getByRole("banner");

      // Wait for the theme button, which renders a placeholder until mounted.
      await expect(banner.getByRole("button", { name: /Switch to/ })).toBeVisible();
      const source = banner.getByRole("link", { name: PAGE_ACTIONS.source });
      const howBuilt = banner.getByRole("button", { name: PAGE_ACTIONS.howBuilt });
      await expect(source).toBeVisible();
      await expect(howBuilt).toBeVisible();

      await expectBannerFits(page);

      const wide = viewport.width >= 1024;
      for (const link of SITE_LINKS) {
        const siteLink = banner.getByRole("link", { name: link.label });
        await (wide ? expect(siteLink).toBeVisible() : expect(siteLink).toBeHidden());
      }
      if (wide) await expect(banner.getByRole("link", { name: switchName })).toBeVisible();

      const labelsShown = viewport.width >= 1280;
      for (const label of [source.getByText(PAGE_ACTIONS.source), howBuilt.getByText(PAGE_ACTIONS.howBuilt)]) {
        await (labelsShown ? expect(label).toBeVisible() : expect(label).toBeHidden());
      }

      if (!wide) {
        // No room for the switch and the site links in the bar: the sheet has them.
        await banner.getByRole("button", { name: "Open navigation" }).click();
        const sheet = page.getByRole("dialog");
        await expect(sheet.getByRole("link", { name: switchName })).toBeVisible();
        for (const link of SITE_LINKS) {
          await expect(sheet.getByRole("link", { name: link.label })).toBeVisible();
        }
      }
    });
  }
});
