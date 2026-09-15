import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { features } from "../src/features";
import { configureHref } from "../src/lib/routes";
import { PAGE_ACTIONS } from "../src/lib/site";
import { HOW_BUILT, HOW_BUILT_TEXT, findVariableReferences } from "../src/lib/how-built";
import { getRecordCollection, recordTitle } from "../src/schemas/records";
import { getResult, listResults, saveResult } from "../src/storage/survey-results";

/**
 * The shared records page, proved on `/work-orders`: the list and its columns,
 * the header actions, new / cancel / save, the unsaved-changes dialog, and the
 * "How this page is built" panel. Then what a work order adds: totals, the
 * signature rule, a record linked to its original, and the job sheet PDF. Every
 * label comes from the code under test.
 */

const workOrders = getRecordCollection("workOrders");
const statusLabels = workOrders.columns.find((column) => column.key === "status")!.labels!;

/** WO-2026-0118, by hand: parts 186 + 49 + 177 + 31.20 + 142 + 38.40 + 57.90 + 25 = 706.50; labor 5.75 h × $85 = 488.75. */
const TOTAL_0118 = "$1,195.25";

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
    const rows = await listResults("workOrders");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).not.toHaveProperty("data");

    const record = await getResult("workOrders", rows[0].id);
    expect(record?.data.jobNumber).toBe(rows[0].id);

    const saved = await saveResult("workOrders", record!.id, { ...record!.data, status: "completed" });
    expect(saved.columns.status).toBe("completed");
    expect(saved.data.status).toBe("completed");
  });

  test("getRecordCollection throws on an unknown id", () => {
    expect(() => getRecordCollection("nope")).toThrow();
  });
});

/** The form column: everything under the form's heading. */
function formHeading(page: Page) {
  return page.getByRole("heading", { level: 2 }).filter({ hasText: /^(View|Edit|New) / });
}

/** The list: the first table on the page; the parts matrix is a table too. */
function listRow(page: Page, id: string) {
  return page.getByRole("table").first().getByRole("row", { name: new RegExp(id) });
}

async function chooseStatus(page: Page, label: string) {
  // Beneath the list, the form starts below the fold; a dropdown opened while the
  // page scrolls to it closes again.
  const dropdown = page.locator('[data-name="status"] .sd-dropdown').first();
  await dropdown.scrollIntoViewIfNeeded();
  await dropdown.click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(dropdown).toContainText(label);
}

async function openForEdit(page: Page, id: string) {
  await listRow(page, id).getByRole("button", { name: "Edit" }).click();
  await expect(formHeading(page)).toHaveText(`Edit ${id}`);
}

async function nextPage(page: Page) {
  await page.getByRole("button", { name: "Next" }).click();
}

/** A text answer, committed the way survey-core commits one: on blur. */
async function type(page: Page, name: string, value: string) {
  const field = page.locator(`[data-name="${name}"]`).locator("input, textarea").first();
  await field.fill(value);
  await field.press("Tab");
}

test.describe("on /work-orders", () => {
  test("the first record is open, and the header holds its actions", async ({ page }) => {
    const rows = await listResults("workOrders");
    await page.goto("/work-orders");
    await expect(formHeading(page)).toHaveText(`View ${recordTitle(workOrders, rows[0])}`);

    await expect(page.getByRole("button", { name: "Save as PDF" })).toBeVisible();
    await expect(page.getByRole("link", { name: features.designer.label })).toHaveAttribute(
      "href",
      configureHref(workOrders.schemaId),
    );
    await expect(page.getByRole("link", { name: "View analytics" })).toHaveCount(
      features.analyticsHref ? 1 : 0,
    );
    await expect(page.getByRole("button", { name: /Signed in as/ })).toHaveCount(0);
  });

  test("+ New opens an unsaved record, and Cancel goes back", async ({ page }) => {
    await page.goto("/work-orders");
    const rows = page.getByRole("table").first().getByRole("row");
    const before = await rows.count();
    const heading = await formHeading(page).textContent();

    await page.getByRole("button", { name: `New ${workOrders.noun.one}` }).click();
    await expect(formHeading(page)).toHaveText(`New ${workOrders.noun.one}`);
    await expect(rows).toHaveCount(before);

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(formHeading(page)).toHaveText(heading!);
    await expect(rows).toHaveCount(before);
  });

  test("saving writes the columns back from the document", async ({ page }) => {
    const [first] = await listResults("workOrders");
    await page.goto("/work-orders");
    const title = recordTitle(workOrders, first);

    await openForEdit(page, title);
    await chooseStatus(page, statusLabels.completed);
    await page.getByRole("button", { name: "Save changes" }).first().click();

    await expect(formHeading(page)).toHaveText(`View ${title}`);
    await expect(listRow(page, title).locator('[data-slot="badge"]')).toHaveText(statusLabels.completed);
  });

  test("leaving a changed form asks first", async ({ page }) => {
    const rows = await listResults("workOrders");
    await page.goto("/work-orders");
    const [first, second] = [recordTitle(workOrders, rows[0]), recordTitle(workOrders, rows[1])];

    await openForEdit(page, first);
    await chooseStatus(page, statusLabels.completed);

    const other = listRow(page, second);
    await other.getByRole("cell").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(`Discard changes to ${first}?`);

    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(formHeading(page)).toHaveText(`Edit ${first}`);

    await other.getByRole("cell").first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
    await expect(formHeading(page)).toHaveText(`View ${second}`);
  });

  test("the how-built panel describes the page", async ({ page }) => {
    await page.goto("/work-orders");
    const toggle = page.getByRole("banner").getByRole("button", { name: PAGE_ACTIONS.howBuilt });
    await toggle.click();

    const panel = page.getByRole("complementary", { name: PAGE_ACTIONS.howBuilt });
    await expect(panel).toBeVisible();
    for (const item of [...HOW_BUILT.workOrders!.dataIn, ...HOW_BUILT.workOrders!.dataOut]) {
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

test.describe("a work order", () => {
  test("WO-2026-0118 shows its hand-computed total in the list and in the form", async ({ page }) => {
    await page.goto("/work-orders");
    await expect(listRow(page, "WO-2026-0118")).toContainText(TOTAL_0118);
    await expect(formHeading(page)).toHaveText("View WO-2026-0118");
    await nextPage(page);
    await expect(page.locator('[data-name="partsTotal"]')).toContainText("$706.50");
    await expect(page.locator('[data-name="laborTotal"]')).toContainText("$488.75");
    await expect(page.locator('[data-name="total"]')).toContainText(TOTAL_0118);
  });

  test("adding a part recomputes the parts total and the total", async ({ page }) => {
    await page.goto("/work-orders");
    await openForEdit(page, "WO-2026-0121");
    await nextPage(page);
    await expect(page.locator('[data-name="total"]')).toContainText("$212.50");

    await page.getByRole("button", { name: "Add a part" }).click();
    const row = page.locator('[data-name="parts"] tbody tr').filter({ has: page.locator("input") }).last();
    const cells = row.locator("input");
    await cells.nth(0).fill("FM-13");
    await cells.nth(2).fill("2");
    await cells.nth(2).press("Tab");
    await cells.nth(3).fill("12.5");
    await cells.nth(3).press("Tab");

    await expect(page.locator('[data-name="partsTotal"]')).toContainText("$25.00");
    await expect(page.locator('[data-name="total"]')).toContainText("$237.50");
  });

  test("a completed record entered by hand does not save without a signature; a draft does", async ({ page }) => {
    const existing = (await listResults("workOrders")).map((row) => row.id);
    const id = workOrders.newId(existing);
    await page.goto("/work-orders");

    await page.getByRole("button", { name: `New ${workOrders.noun.one}` }).click();
    await expect(formHeading(page)).toHaveText(`New ${workOrders.noun.one}`);
    // A record entered by hand has no original to show.
    await expect(page.getByText("Source document", { exact: true })).toHaveCount(0);
    await type(page, "visitDate", "2026-09-16");
    await type(page, "customerName", "Halcyon Foods");
    await type(page, "siteAddress", "Halcyon Foods cold store\n5120 NE Columbia Blvd, Portland, OR 97218");
    await nextPage(page);
    await type(page, "faultReported", "Dock door heater not working.");

    // A draft saves with no work, no outcome and no signature.
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(formHeading(page)).toHaveText(`View ${id}`);
    await expect(listRow(page, id).locator('[data-slot="badge"]')).toHaveText(statusLabels.draft);

    // Completed, with everything but the signature: refused.
    await openForEdit(page, id);
    await chooseStatus(page, statusLabels.completed);
    await nextPage(page);
    await type(page, "workPerformed", "Replaced the heater element.");
    await page.locator('[data-name="outcome"]').getByText("Resolved", { exact: true }).click();
    await type(page, "signedByName", "Luis Ortega");
    await page.getByRole("button", { name: "Save changes" }).first().click();

    await expect(page.locator('[data-name="customerSignature"]')).toContainText("Response required");
    await expect(formHeading(page)).toHaveText(`Edit ${id}`);
    await expect(listRow(page, id).locator('[data-slot="badge"]')).toHaveText(statusLabels.draft);
  });

  test("WO-2026-0120 links the document it was read from, and saves as completed without a signature", async ({ page }) => {
    await page.goto("/work-orders");
    await listRow(page, "WO-2026-0120").getByRole("cell").first().click();
    await expect(formHeading(page)).toHaveText("View WO-2026-0120");

    await expect(page.getByText("Source document", { exact: true })).toBeVisible();
    const link = page.locator('[data-name="sourceDocument"] a');
    await expect(link).toHaveAttribute("href", "/samples/work-order-0120-scan.jpg");

    await openForEdit(page, "WO-2026-0120");
    await expect(page.locator('[data-name="sourceDocument"] a')).toHaveAttribute("href", "/samples/work-order-0120-scan.jpg");
    await expect(page.locator('[data-name="sourceDocument"] .sd-file')).toHaveClass(/sd-file--readonly/);
    await expect(page.locator('[data-name="importedAt"] input')).toHaveAttribute("readonly", "");
    await expect(page.locator('[data-name="importedAt"] input')).toHaveValue("2026-09-02T15:20");

    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(formHeading(page)).toHaveText("View WO-2026-0120");
    await expect(listRow(page, "WO-2026-0120").locator('[data-slot="badge"]')).toHaveText(statusLabels.completed);

    // A record entered on the tablet shows no Source document panel.
    await listRow(page, "WO-2026-0118").getByRole("cell").first().click();
    await expect(formHeading(page)).toHaveText("View WO-2026-0118");
    await expect(page.getByText("Source document", { exact: true })).toHaveCount(0);
  });

  for (const [id, pages] of [["WO-2026-0118", 2], ["WO-2026-0121", 1]] as const) {
    test(`Save as PDF prints ${id} onto the job sheet, ${pages} sheet${pages === 1 ? "" : "s"}`, async ({ page }) => {
      await page.goto("/work-orders");
      await listRow(page, id).getByRole("cell").first().click();
      await expect(formHeading(page)).toHaveText(`View ${id}`);

      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Save as PDF" }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe(`job-sheet-${id.toLowerCase()}.pdf`);
      const doc = await PDFDocument.load(await readFile((await file.path())!));
      expect(doc.getPageCount()).toBe(pages);
    });
  }
});
