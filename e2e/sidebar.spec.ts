import { test, expect } from "@playwright/test";
import { navHref, navItems, navPages, opensInNewTab } from "../src/schemas/navigation";
import { EXTERNAL_URLS } from "../src/lib/site";

/**
 * The admin sidebar, in both editions: one list, the same everywhere.
 *
 * The expected groups are written out here rather than read from `navGroups`,
 * so a change to the navigation data has to be made twice, on purpose.
 */

const EXPECTED_GROUPS = [
  { label: "In your app", items: ["Leads", "Feedback", "Encounter note", "Appointment"] },
  { label: "Documents", items: ["Work orders"] },
  { label: "Together", items: ["Fill together", "Edit together"] },
  { label: "For developers", items: ["Starter", "Definition & checks"] },
];

test("the groups and their items appear in order", async ({ page }) => {
  await page.goto("/leads");
  const sidebar = page.getByRole("navigation", { name: "Primary" });
  const groups = sidebar.getByRole("group");

  await expect(groups).toHaveCount(EXPECTED_GROUPS.length);
  for (const [index, expected] of EXPECTED_GROUPS.entries()) {
    const group = groups.nth(index);
    // The label is uppercase by CSS only; the accessible name keeps its case.
    await expect(sidebar.getByRole("group", { name: expected.label })).toBeVisible();
    const links = group.getByRole("link");
    await expect(links).toHaveCount(expected.items.length);
    for (const [itemIndex, label] of expected.items.entries()) {
      await expect(links.nth(itemIndex)).toContainText(label);
    }
  }
});

test("↗ and a new tab exactly where opensInNewTab says so", async ({ page }) => {
  await page.goto("/leads");
  const sidebar = page.getByRole("navigation", { name: "Primary" });

  for (const item of navItems) {
    const link = sidebar.locator(`a[href="${navHref(item)}"]`);
    await expect(link).toHaveCount(1);
    if (opensInNewTab(item)) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noreferrer");
      await expect(link).toContainText("↗");
    } else {
      await expect(link).not.toHaveAttribute("target", /.*/);
      await expect(link).not.toContainText("↗");
    }
  }

  await expect(sidebar.getByRole("link", { name: /^Fill together/ })).toHaveAttribute(
    "href",
    EXTERNAL_URLS.fillTogether,
  );
  const editTogether = sidebar.getByRole("link", { name: /^Edit together/ });
  await expect(editTogether).toHaveAttribute("href", EXTERNAL_URLS.editTogether);
  await expect(editTogether.locator('[data-slot="badge"]')).toHaveText("preview");
});

for (const item of navPages.filter((page) => page.layout === "shell")) {
  test(`${item.path} answers and is headed "${item.label}"`, async ({ page }) => {
    const response = await page.goto(item.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(item.label);
    await expect(
      page.getByRole("navigation", { name: "Primary" }).locator(`a[href="${item.path}"]`),
    ).toHaveAttribute("aria-current", "page");
  });
}

test("/definition is the JSON editor and its linter, inside the shell", async ({ page }) => {
  test.slow();
  await page.goto("/definition");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText("Static analysis: all checks passed", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  // The picker opens any form in the template on the same page.
  await page.getByRole("combobox", { name: "Form" }).selectOption("work-order");
  await expect(page).toHaveURL(/\/definition\?form=work-order$/);
  await expect(page.getByText("Work order — form JSON")).toBeVisible();
});

test("the root lands on /leads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/leads$/);
});

test.describe("legacy redirects", () => {
  // The only place in e2e/ that names a legacy path.
  const REDIRECTS = [
    ["/records", "/work-orders"],
    ["/claims", "/work-orders"],
    ["/checkout", "/starter"],
    ["/checkout/configure", "/configure?form=checkout"],
    ["/records/configure", "/configure?form=work-order"],
    ["/claims/configure", "/configure?form=work-order"],
  ] as const;

  for (const [from, to] of REDIRECTS) {
    test(`${from} redirects to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers()["location"]).toBe(to);
    });
  }
});
