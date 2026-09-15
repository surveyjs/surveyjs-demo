import { test, expect, type Page } from "@playwright/test";
import { features } from "../src/features";
import { configureHref } from "../src/lib/routes";
import { PAGE_ACTIONS } from "../src/lib/site";
import { HOW_BUILT, HOW_BUILT_TEXT, findVariableReferences } from "../src/lib/how-built";
import { getRecordCollection, recordTitle } from "../src/schemas/records";
import { getResult, listResults, saveResult } from "../src/storage/survey-results";

/**
 * The shared records page, proved on `/claims`: the list and its columns, the
 * header actions, new / cancel / save, the unsaved-changes dialog, and the
 * "How this page is built" panel. Every label comes from the code under test.
 */

const claims = getRecordCollection("claims");

test.describe("helpers", () => {
  test("findVariableReferences finds references on elements, columns and defaults", () => {
    const json = {
      pages: [
        {
          name: "p1",
          elements: [
            { type: "text", name: "budget", visibleIf: "{user.role} = 'manager'" },
            {
              type: "matrixdynamic",
              name: "m",
              columns: [{ name: "c", cellType: "number", enableIf: "{user.canEdit}" }],
            },
            { type: "text", name: "owner", defaultValueExpression: "{user}" },
            { type: "text", name: "other", visibleIf: "{userName} notempty" },
          ],
        },
      ],
    };
    const found = findVariableReferences(json, ["user"]);
    expect(found).toEqual([
      { element: "budget", property: "visibleIf", expression: "{user.role} = 'manager'" },
      { element: "m › c", property: "enableIf", expression: "{user.canEdit}" },
      { element: "owner", property: "defaultValueExpression", expression: "{user}" },
    ]);
  });

  test("storage returns columns from the list and the document from getResult", async () => {
    const rows = await listResults("claims");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).not.toHaveProperty("data");

    const record = await getResult("claims", rows[0].id);
    expect(record?.data.claimNumber).toBe(rows[0].id);

    const saved = await saveResult("claims", record!.id, { ...record!.data, status: "denied" });
    expect(saved.columns.status).toBe("denied");
    expect(saved.data.status).toBe("denied");
  });

  test("getRecordCollection throws on an unknown id", () => {
    expect(() => getRecordCollection("nope")).toThrow();
  });
});

/** The form column: everything under the form's heading. */
function formHeading(page: Page) {
  return page.getByRole("heading", { level: 2 }).filter({ hasText: /^(View|Edit|New) / });
}

async function chooseStatus(page: Page, label: string) {
  await page.locator('[data-name="status"] .sd-dropdown').first().click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

test.describe("on /claims", () => {
  test("the first record is open, and the header holds its actions", async ({ page }) => {
    const rows = await listResults("claims");
    await page.goto("/claims");
    await expect(formHeading(page)).toHaveText(`View ${recordTitle(claims, rows[0])}`);

    await expect(page.getByRole("button", { name: "Save as PDF" })).toBeVisible();
    await expect(page.getByRole("link", { name: features.designer.label })).toHaveAttribute(
      "href",
      configureHref(claims.schemaId),
    );
    await expect(page.getByRole("link", { name: "View analytics" })).toHaveCount(
      features.analyticsHref ? 1 : 0,
    );
    await expect(page.getByRole("button", { name: /Signed in as/ })).toHaveCount(0);
  });

  test("+ New opens an unsaved record, and Cancel goes back", async ({ page }) => {
    await page.goto("/claims");
    // The first table is the list; the claim form's matrices are tables too.
    const rows = page.getByRole("table").first().getByRole("row");
    const before = await rows.count();
    const heading = await formHeading(page).textContent();

    await page.getByRole("button", { name: `New ${claims.noun.one}` }).click();
    await expect(formHeading(page)).toHaveText(`New ${claims.noun.one}`);
    await expect(rows).toHaveCount(before);

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(formHeading(page)).toHaveText(heading!);
    await expect(rows).toHaveCount(before);
  });

  test("saving writes the columns back from the document", async ({ page }) => {
    const [first] = await listResults("claims");
    await page.goto("/claims");
    const row = page.getByRole("row", { name: new RegExp(recordTitle(claims, first)) });

    await page.getByRole("button", { name: "Edit", exact: true }).first().click();
    await expect(formHeading(page)).toHaveText(`Edit ${recordTitle(claims, first)}`);
    await chooseStatus(page, "Denied");
    await page.getByRole("button", { name: "Save changes" }).first().click();

    await expect(formHeading(page)).toHaveText(`View ${recordTitle(claims, first)}`);
    await expect(row.locator('[data-slot="badge"]')).toHaveText("denied");
  });

  test("leaving a changed form asks first", async ({ page }) => {
    const rows = await listResults("claims");
    await page.goto("/claims");

    await page.getByRole("button", { name: "Edit", exact: true }).first().click();
    await expect(formHeading(page)).toHaveText(`Edit ${recordTitle(claims, rows[0])}`);
    await chooseStatus(page, "Denied");

    const other = page.getByRole("row", { name: new RegExp(recordTitle(claims, rows[1])) });
    await other.getByRole("cell").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(`Discard changes to ${recordTitle(claims, rows[0])}?`);

    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(formHeading(page)).toHaveText(`Edit ${recordTitle(claims, rows[0])}`);

    await other.getByRole("cell").first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
    await expect(formHeading(page)).toHaveText(`View ${recordTitle(claims, rows[1])}`);
  });

  test("the how-built panel describes the page", async ({ page }) => {
    await page.goto("/claims");
    const toggle = page.getByRole("banner").getByRole("button", { name: PAGE_ACTIONS.howBuilt });
    await toggle.click();

    const panel = page.getByRole("complementary", { name: PAGE_ACTIONS.howBuilt });
    await expect(panel).toBeVisible();
    for (const item of HOW_BUILT.claims!.dataIn) {
      await expect(panel).toContainText(item.label);
    }
    await expect(panel).toContainText(HOW_BUILT_TEXT.noVariables);

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  test("a page with no description says so", async ({ page }) => {
    await page.goto("/starter");
    await page.getByRole("banner").getByRole("button", { name: PAGE_ACTIONS.howBuilt }).click();
    await expect(
      page.getByRole("complementary", { name: PAGE_ACTIONS.howBuilt }),
    ).toContainText(HOW_BUILT_TEXT.notDescribed);
  });
});
