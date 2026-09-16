import { test, expect, type Page } from "@playwright/test";
import { features } from "../src/features";
import { configureHref } from "../src/lib/routes";
import { PAGE_ACTIONS } from "../src/lib/site";
import { HOW_BUILT, HOW_BUILT_TEXT, findVariableReferences, itemsInEdition } from "../src/lib/how-built";
import { getFormNavItem } from "../src/schemas/navigation";
import { getRecordCollection, recordTitle } from "../src/schemas/records";
import type { SurveyData } from "../src/schemas/types";
import { getResult, listResults } from "../src/storage/survey-results";
import { startSession } from "./session";

/**
 * The shared records page, proved on `/work-orders`: the rail, record URLs and
 * Back, the header actions, new / cancel / save / delete, the unsaved-changes
 * dialog, the import panel, the outline around the form, and the "How this page
 * is built" panel. Then what a work order adds: totals, the signature rule and a
 * record linked to its original. Every label comes from the code under test. The
 * job sheet PDF is the full edition's, and so is its spec.
 */

const workOrders = getRecordCollection("workOrders");
const workOrdersNav = getFormNavItem("workOrders");
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

  test("storage returns columns from the list and the document from getResult", async ({ request }) => {
    // Outside a request the seam reads the template, which is the seed.
    const rows = await listResults("workOrders");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).not.toHaveProperty("data");

    const record = await getResult("workOrders", rows[0].id);
    expect(record?.data.jobNumber).toBe(rows[0].id);

    // Records are written from the browser, so the write goes through the route,
    // as a visitor of its own.
    await startSession(request);
    const put = await request.put(`/api/storage/results/workOrders/${record!.id}`, {
      data: { data: { ...record!.data, status: "completed" } },
    });
    expect(put.ok()).toBe(true);
    const saved = (await put.json()) as { id: string; data: SurveyData };
    expect(saved.id).toBe(record!.id);
    expect(saved.data.status).toBe("completed");

    // The list route returns documents; the seam derives the columns from them.
    const list = (await (await request.get("/api/storage/results/workOrders")).json()) as {
      id: string;
      data: SurveyData;
    }[];
    const stored = list.find((item) => item.id === record!.id)!;
    expect(stored).not.toHaveProperty("columns");
    expect(workOrders.toColumns(stored.id, stored.data).status).toBe("completed");
  });

  test("getRecordCollection throws on an unknown id", () => {
    expect(() => getRecordCollection("nope")).toThrow();
  });
});

/** The form column: everything under the form's heading. */
function formHeading(page: Page) {
  return page.getByRole("heading", { level: 2 }).filter({ hasText: /^(View|Edit|New) / });
}

/** The rail: a navigation landmark named after the page, holding one link per record. */
function rail(page: Page, label = workOrdersNav.label) {
  return page.getByRole("navigation", { name: label, exact: true });
}

/** One record in the rail. The job number is in the link's text. */
function listRow(page: Page, id: string) {
  return rail(page).getByRole("link", { name: new RegExp(id) });
}

async function chooseStatus(page: Page, label: string) {
  // The status field can sit below the fold; a dropdown opened while the page
  // scrolls to it closes again.
  const dropdown = page.locator('[data-name="status"] .sd-dropdown').first();
  await dropdown.scrollIntoViewIfNeeded();
  await dropdown.click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(dropdown).toContainText(label);
}

/** Edit lives in the form's header: open the record from the rail, then edit it. */
async function openForEdit(page: Page, id: string) {
  await listRow(page, id).click();
  await expect(formHeading(page)).toHaveText(`View ${id}`);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(formHeading(page)).toHaveText(`Edit ${id}`);
}

function addFromDocument(page: Page) {
  // Exact: the panel's own "Add from your document" must not match.
  return page.getByRole("button", { name: "Add from document", exact: true });
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

    // The job sheet printer, where the edition plugs one in; nothing about it otherwise.
    await expect(page.getByRole("button", { name: "Save as PDF" })).toHaveCount(
      features.exportWorkOrderPdf ? 1 : 0,
    );
    await expect(page.getByText("prints this work order onto")).toHaveCount(
      features.exportWorkOrderPdf ? 1 : 0,
    );
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
    const rows = rail(page).getByRole("link");
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
    await other.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(`Discard changes to ${first}?`);

    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(formHeading(page)).toHaveText(`Edit ${first}`);
    // The URL moves only once the guard lets the click through.
    await expect(page).toHaveURL(new RegExp(`/work-orders/${first}$`));

    await other.click();
    await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
    await expect(formHeading(page)).toHaveText(`View ${second}`);
    await expect(page).toHaveURL(new RegExp(`/work-orders/${second}$`));
  });

  for (const how of ["Escape", "the X button"] as const) {
    test(`Back with a changed form asks first, and dismissing it with ${how} puts the URL back`, async ({ page }) => {
      await page.goto("/work-orders");
      await listRow(page, "WO-2026-0119").click();
      await expect(page).toHaveURL(/\/work-orders\/WO-2026-0119$/);
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await expect(formHeading(page)).toHaveText("Edit WO-2026-0119");
      await chooseStatus(page, statusLabels.completed);

      await page.goBack();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("Discard changes to WO-2026-0119?");
      if (how === "Escape") {
        await page.keyboard.press("Escape");
      } else {
        await dialog.getByRole("button", { name: "Close" }).click();
      }
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(/\/work-orders\/WO-2026-0119$/);
      await expect(formHeading(page)).toHaveText("Edit WO-2026-0119");
    });
  }

  test("Delete sits in the form's header, removes the record and moves the URL", async ({ page }) => {
    const rows = await listResults("workOrders");
    await page.goto("/work-orders/WO-2026-0119");
    await expect(formHeading(page)).toHaveText("View WO-2026-0119");

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    // Cancel first: there is no Delete while editing.
    await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Delete work order?");
    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(rail(page).getByRole("link")).toHaveCount(rows.length - 1);
    await expect(listRow(page, "WO-2026-0119")).toHaveCount(0);
    await expect(formHeading(page)).toHaveText(`View ${recordTitle(workOrders, rows[0])}`);
    await expect(page).toHaveURL(new RegExp(`/work-orders/${rows[0].id}$`));
  });

  test("the how-built panel describes the page", async ({ page }) => {
    await page.goto("/work-orders");
    const toggle = page.getByRole("banner").getByRole("button", { name: PAGE_ACTIONS.howBuilt });
    await toggle.click();

    const panel = page.getByRole("complementary", { name: PAGE_ACTIONS.howBuilt });
    await expect(panel).toBeVisible();
    const { dataIn, dataOut } = HOW_BUILT.workOrders!;
    for (const item of [...dataIn, ...dataOut]) {
      const listed = itemsInEdition([item], features.edition).length > 0;
      await expect(panel.getByText(item.label, { exact: true })).toHaveCount(listed ? 1 : 0);
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
  test("WO-2026-0118 shows its hand-computed total in the form", async ({ page }) => {
    await page.goto("/work-orders");
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
    await listRow(page, "WO-2026-0120").click();
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
    await listRow(page, "WO-2026-0118").click();
    await expect(formHeading(page)).toHaveText("View WO-2026-0118");
    await expect(page.getByText("Source document", { exact: true })).toHaveCount(0);
  });
});

test.describe("the rail", () => {
  for (const id of ["leads", "workOrders"] as const) {
    const nav = getFormNavItem(id);
    test(`on ${nav.path} at 1440px it is 260px wide, two lines a record, and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(nav.path);
      const list = rail(page, nav.label);
      await expect(list.getByRole("link").first()).toBeVisible();

      expect((await list.boundingBox())!.width).toBe(260);
      const overflow = await list.evaluate((element) => {
        const links = [...element.querySelectorAll("a")];
        return {
          rail: element.scrollWidth - element.clientWidth,
          links: links.map((link) => link.scrollWidth - link.clientWidth),
          // Line 1 is one line tall; the whole item is under three.
          tall: links.filter((link) => {
            const line = link.firstElementChild!.getBoundingClientRect().height;
            return link.getBoundingClientRect().height >= 3 * line + 16;
          }).length,
        };
      });
      expect(overflow.rail).toBeLessThanOrEqual(0);
      for (const value of overflow.links) expect(value).toBeLessThanOrEqual(0);
      expect(overflow.tall).toBe(0);
    });
  }

  test("holds links only: no buttons inside", async ({ page }) => {
    await page.goto("/work-orders");
    await expect(rail(page).getByRole("link").first()).toBeVisible();
    await expect(rail(page).getByRole("button")).toHaveCount(0);
  });

  test("a click moves the URL, and Back returns to the first record", async ({ page }) => {
    const rows = await listResults("workOrders");
    await page.goto("/work-orders");
    await listRow(page, "WO-2026-0119").click();
    await expect(page).toHaveURL(/\/work-orders\/WO-2026-0119$/);
    await expect(formHeading(page)).toHaveText("View WO-2026-0119");
    await expect(listRow(page, "WO-2026-0119")).toHaveAttribute("aria-current", "page");

    await page.goBack();
    await expect(formHeading(page)).toHaveText(`View ${recordTitle(workOrders, rows[0])}`);
    await expect(page).toHaveURL(/\/work-orders$/);

    await page.goForward();
    await expect(formHeading(page)).toHaveText("View WO-2026-0119");
  });

  test("an unknown id opens the first record, at that record's URL", async ({ page }) => {
    const response = await page.goto("/work-orders/WO-9999-0000");
    expect(response?.status()).toBe(200);
    await expect(formHeading(page)).toHaveText("View WO-2026-0118");
    await expect(page).toHaveURL(/\/work-orders\/WO-2026-0118$/);
  });

  test("below xl it is a dropdown above the form, and selects the same way", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/work-orders");
    await expect(rail(page)).toBeHidden();

    await page.getByRole("button", { name: "Choose a work order" }).click();
    await page.getByRole("menuitem", { name: /WO-2026-0119/ }).click();
    await expect(formHeading(page)).toHaveText("View WO-2026-0119");
    await expect(page).toHaveURL(/\/work-orders\/WO-2026-0119$/);
  });
});

test.describe("the outline around the form", () => {
  for (const id of ["leads", "workOrders"] as const) {
    const nav = getFormNavItem(id);
    test(`on ${nav.path} it outlines only the form, and its label hides it for good`, async ({ page }) => {
      await page.goto(nav.path);
      const html = page.locator("html");
      const root = page.locator("[data-survey-root]");
      await expect(html).toHaveAttribute("data-demo-highlight", "");
      await expect(root).toHaveCount(1);
      await expect(root).toHaveCSS("outline-style", "dashed");
      await expect(root.locator(".sd-root-modern")).toHaveCount(1);
      // The heading and the actions are the application's, outside the ring.
      await expect(root.getByRole("heading", { level: 2 }).filter({ hasText: /^(View|Edit|New) / })).toHaveCount(0);

      await root.getByRole("button", { name: "SurveyJS renders this (hide selection)" }).click();
      await expect(html).not.toHaveAttribute("data-demo-highlight");
      await expect(root).toHaveCSS("outline-style", "none");

      // Another record does not bring it back.
      const second = rail(page, nav.label).getByRole("link").nth(1);
      const href = await second.getAttribute("href");
      await second.click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(root).toHaveCount(1);
      await expect(html).not.toHaveAttribute("data-demo-highlight");
    });
  }
});

test.describe("the import panel", () => {
  test("opening it replaces the form, moves the URL, and selects nothing", async ({ page }) => {
    await page.goto("/work-orders");
    await expect(page.locator(".sd-root-modern")).toHaveCount(1);
    await addFromDocument(page).click();

    await expect(page).toHaveURL(/\/work-orders\/from-document$/);
    await expect(page.locator(".sd-root-modern")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add from PDF" })).toBeVisible();
    await expect(addFromDocument(page)).toBeDisabled();
    await expect(rail(page).locator('[aria-current="page"]')).toHaveCount(0);
    // "Save as PDF" is the record's, and no record is open.
    if (features.exportWorkOrderPdf) {
      await expect(page.getByRole("button", { name: "Save as PDF" })).toBeDisabled();
    }
  });

  test("Close returns to /work-orders when opened there", async ({ page }) => {
    await page.goto("/work-orders");
    await addFromDocument(page).click();
    await expect(page).toHaveURL(/\/work-orders\/from-document$/);

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page).toHaveURL(/\/work-orders$/);
    await expect(formHeading(page)).toHaveText("View WO-2026-0118");
  });

  test("Close returns to the record it was opened from", async ({ page }) => {
    await page.goto("/work-orders/WO-2026-0119");
    await addFromDocument(page).click();
    await expect(page).toHaveURL(/\/work-orders\/from-document$/);

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page).toHaveURL(/\/work-orders\/WO-2026-0119$/);
    await expect(formHeading(page)).toHaveText("View WO-2026-0119");
  });

  test("New from the panel opens a blank form at the return URL, and Cancel shows the return record", async ({ page }) => {
    await page.goto("/work-orders/WO-2026-0119");
    await addFromDocument(page).click();
    await expect(page).toHaveURL(/\/work-orders\/from-document$/);

    await page.getByRole("button", { name: `New ${workOrders.noun.one}` }).click();
    await expect(formHeading(page)).toHaveText(`New ${workOrders.noun.one}`);
    await expect(page).toHaveURL(/\/work-orders\/WO-2026-0119$/);

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(formHeading(page)).toHaveText("View WO-2026-0119");
    await expect(page).toHaveURL(/\/work-orders\/WO-2026-0119$/);
  });

  test("with unsaved changes, opening it asks first", async ({ page }) => {
    await page.goto("/work-orders");
    await openForEdit(page, "WO-2026-0118");
    await chooseStatus(page, statusLabels.completed);

    await addFromDocument(page).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Discard changes to WO-2026-0118?");
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(formHeading(page)).toHaveText("Edit WO-2026-0118");
    await expect(page).toHaveURL(/\/work-orders\/WO-2026-0118$/);

    await addFromDocument(page).click();
    await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
    await expect(page).toHaveURL(/\/work-orders\/from-document$/);
    await expect(page.locator(".sd-root-modern")).toHaveCount(0);
  });

  test("its own URL is rendered on the server, and Close from there goes to the page", async ({ page }) => {
    const response = await page.goto("/work-orders/from-document");
    expect(response?.status()).toBe(200);
    const html = await response!.text();
    expect(html).toContain("Add from PDF");
    expect(html).not.toContain("sd-root-modern");

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page).toHaveURL(/\/work-orders$/);
    await expect(formHeading(page)).toHaveText("View WO-2026-0118");
  });

  test("/leads has none", async ({ page }) => {
    await page.goto("/leads");
    await expect(formHeading(page)).toBeVisible();
    await expect(addFromDocument(page)).toHaveCount(0);
  });
});
