import { test, expect, type Page } from "@playwright/test";
import { QuestionMatrixDynamicModel, QuestionPanelDynamicModel } from "survey-core";
import { getFormNavItem } from "../src/schemas/navigation";
import { assignRowIds, getRecordCollection, recordTitle } from "../src/schemas/records";
import { createSurveyModel } from "../src/schemas/createSurveyModel";
import { leadsJson } from "../src/schemas/leads";
import type { SurveyData } from "../src/schemas/types";
import { getResult, listResults } from "../src/storage/survey-results";
import { startSession } from "./session";
import { LEADS_USERS } from "../src/storage/session";
import { toVariables } from "../src/schemas/variables";

/**
 * `/leads`: a CRM opportunity on the shared records page. Totals over the line
 * items, the economic-buyer rule over the contacts, the signed-in user's role
 * and currency, and stable row ids. The page mechanics themselves are covered
 * on `/work-orders` by `records.spec.ts`.
 */

const leads = getRecordCollection("leads");
const leadsNav = getFormNavItem("leads");
const [sales, manager] = LEADS_USERS;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONTAINERS = leads.rowIdContainers!;

test.describe("helpers", () => {
  test("assignRowIds fills missing ids, keeps existing ones, and ignores other arrays", () => {
    const data = {
      lineItems: [{ id: "kept", quantity: 1 }, { quantity: 2 }, { id: "", quantity: 3 }],
      blockers: ["legal"],
      other: [{ name: "untouched" }],
    };
    const result = assignRowIds(data, ["lineItems", "blockers"]);
    const items = result.lineItems as { id: string }[];
    expect(items[0].id).toBe("kept");
    expect(items[1].id).toMatch(UUID);
    expect(items[2].id).toMatch(UUID);
    expect(result.blockers).toEqual(["legal"]);
    expect(result.other).toEqual([{ name: "untouched" }]);
    expect((data.lineItems[1] as { id?: string }).id).toBeUndefined();
  });

  test("every row keeps its id through edits, removals and a second save", async ({ request }) => {
    // Kestrel Freight: four line items, four contacts, five activities.
    const first = (await listResults("leads")).find((row) => row.columns.accountName === "Kestrel Freight")!;
    const stored = (await getResult("leads", first.id))!;
    const before = new Map(
      CONTAINERS.map((name) => [name, ((stored.data[name] ?? []) as { id: string }[]).map((row) => row.id)]),
    );

    // The same model the page builds: the hidden id has to survive it.
    const model = createSurveyModel(leadsJson, { data: stored.data, variables: toVariables(manager) });
    const lineItems = model.getQuestionByName("lineItems") as QuestionMatrixDynamicModel;
    const contacts = model.getQuestionByName("contacts") as QuestionPanelDynamicModel;
    const activities = model.getQuestionByName("activities") as QuestionMatrixDynamicModel;
    lineItems.visibleRows[1].getQuestionByName("quantity").value = 75;
    lineItems.removeRow(0);
    lineItems.addRow();
    contacts.addPanel();
    activities.addRow();

    // The new rows are filled in, as the page requires before its Save completes
    // the form and as the record route now requires before it stores anything:
    // a row somebody started and left blank is an incomplete record, not a saved
    // one. Only the answers the form insists on, so the ids are still what this
    // test is about.
    const added = lineItems.visibleRows[lineItems.visibleRows.length - 1];
    added.getQuestionByName("product").value = "platform";
    added.getQuestionByName("unitPrice").value = 1200;
    contacts.panels[contacts.panels.length - 1].getQuestionByName("fullName").value = "Nadia Okoro";

    // Row ids are assigned by the record route, on write, so the save goes
    // through it, as a visitor of its own.
    await startSession(request);
    const save = async (data: SurveyData) => {
      const response = await request.put(`/api/storage/results/leads/${first.id}`, { data: { data } });
      expect(response.ok()).toBe(true);
      const stored = (await response.json()) as { id: string; data: SurveyData };
      expect(stored.id).toBe(first.id);
      return stored;
    };
    const saved = await save(model.data);
    for (const name of CONTAINERS) {
      const rows = (saved.data[name] ?? []) as { id: string }[];
      for (const row of rows) expect(row.id, `${name} row`).toMatch(UUID);
    }
    const savedLineIds = (saved.data.lineItems as { id: string }[]).map((row) => row.id);
    // The first row was removed; the other three keep their ids, and the added row is last.
    expect(savedLineIds.slice(0, -1)).toEqual(before.get("lineItems")!.slice(1));
    expect(savedLineIds.at(-1)).not.toBe(before.get("lineItems")![0]);
    expect((saved.data.contacts as { id: string }[]).slice(0, -1).map((row) => row.id)).toEqual(
      before.get("contacts"),
    );

    const again = await save(saved.data);
    for (const name of CONTAINERS) {
      expect(((again.data[name] ?? []) as { id: string }[]).map((row) => row.id)).toEqual(
        ((saved.data[name] ?? []) as { id: string }[]).map((row) => row.id),
      );
    }
  });

  test("the list's deal value is recomputed from the line items", async () => {
    const rows = await listResults("leads");
    const kestrel = rows.find((row) => row.columns.accountName === "Kestrel Freight")!;
    expect(kestrel.columns.dealValue).toBe(162340);
    expect(kestrel.columns.currency).toBe("EUR");
    expect(kestrel.columns.ownerName).toBe("Ines Moreau");
    // Soonest expected close first; a lead without one goes last.
    expect(rows.at(-1)!.columns.accountName).toBe("Bluepeak Energy");
  });
});

/* ── page helpers ─────────────────────────────────────────────────────────── */

const form = (page: Page) => page.locator(".sd-root-modern");

function formHeading(page: Page) {
  return page.getByRole("heading", { level: 2 }).filter({ hasText: /^(View|Edit|New) / });
}

/** The rail: a navigation landmark named after the page. */
function rail(page: Page) {
  return page.getByRole("navigation", { name: leadsNav.label, exact: true });
}

/** One lead in the rail, by account: the account is the link's first line. */
function listRow(page: Page, account: string) {
  return rail(page).getByRole("link", { name: new RegExp(account) });
}

/** Opens a lead from the rail; editing is the form header's Edit. */
async function openLead(page: Page, account: string, mode: "view" | "edit" = "view") {
  await listRow(page, account).click();
  await expect(formHeading(page)).toHaveText(`View ${account}`);
  if (mode === "edit") {
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(formHeading(page)).toHaveText(`Edit ${account}`);
  }
}

async function nextPage(page: Page) {
  await form(page).getByRole("button", { name: "Next" }).click();
}

async function signInAs(page: Page, name: string) {
  await page.getByRole("button", { name: /^Signed in as:/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
  await expect(page.getByRole("button", { name: `Signed in as: ${name}` })).toBeVisible();
}

async function choose(page: Page, combobox: ReturnType<Page["locator"]>, option: string) {
  await combobox.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function fillCell(page: Page, row: number, column: RegExp | string, value: string) {
  const input = form(page).getByRole("textbox", { name: new RegExp(`row ${row}, column ${column}`) })
    .or(form(page).getByRole("spinbutton", { name: new RegExp(`row ${row}, column ${column}`) }));
  await input.fill(value);
  await input.press("Tab");
}

test.describe("on /leads", () => {
  test("opens a lead from the list", async ({ page }) => {
    const rows = await listResults("leads");
    await page.goto("/leads");
    await expect(rail(page).getByRole("link")).toHaveCount(rows.length);
    await openLead(page, "Northwind Labs");
    await expect(form(page).locator('[data-name="accountName"] input')).toHaveValue("Northwind Labs");
    await expect(page.getByRole("button", { name: `Signed in as: ${sales.name}` })).toBeVisible();
    // The list's first row is the soonest expected close.
    await expect(rail(page).getByRole("link").first()).toContainText(recordTitle(leads, rows[0]));
  });

  test("a lead's own URL opens it, marked in the rail", async ({ page }) => {
    const response = await page.goto("/leads/LEAD-0002");
    expect(await response!.text()).toContain("View Halcyon Foods");
    await expect(formHeading(page)).toHaveText("View Halcyon Foods");
    await expect(listRow(page, "Halcyon Foods")).toHaveAttribute("aria-current", "page");
    await expect(page).toHaveURL(/\/leads\/LEAD-0002$/);
  });

  test("/leads opens the first lead and keeps its URL", async ({ page }) => {
    const rows = await listResults("leads");
    await page.goto("/leads");
    await expect(formHeading(page)).toHaveText(`View ${recordTitle(leads, rows[0])}`);
    await expect(rail(page).getByRole("link").first()).toHaveAttribute("aria-current", "page");
    await expect(page).toHaveURL(/\/leads$/);
  });

  test("a new line item recomputes its total and the deal; removing it leaves the form valid", async ({ page }) => {
    await page.goto("/leads");
    await openLead(page, "Bluepeak Energy", "edit");
    await nextPage(page);

    await form(page).getByRole("button", { name: "Add a product" }).click();
    await choose(page, form(page).getByRole("combobox", { name: "row 1, column Product" }), "Platform licence (per developer)");
    await fillCell(page, 1, "Qty", "10");
    await fillCell(page, 1, "Unit price", "900");
    await fillCell(page, 1, "Discount %", "10");

    // 10 × 900 = 9,000, less 10% = 8,100; the lead is New, so weighted at 10%.
    await expect(form(page).locator('td[title^="Line total"]').first()).toContainText("8,100.00");
    await expect(form(page).locator('[data-name="dealValue"]')).toContainText("8,100.00");
    await expect(form(page).locator('[data-name="discountTotal"]')).toContainText("900.00");
    await expect(form(page).locator('[data-name="weightedValue"]')).toContainText("810.00");

    await form(page).getByRole("button", { name: "Remove" }).first().click();
    await expect(form(page).locator('[data-name="dealValue"]')).toContainText("0.00");
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(formHeading(page)).toHaveText("View Bluepeak Energy");
  });

  test("the economic-buyer warning follows the contacts, and a contact can be added", async ({ page }) => {
    await page.goto("/leads");
    await openLead(page, "Halcyon Foods");
    const warning = form(page).getByText("No economic buyer on this deal yet.");
    await expect(warning).toBeVisible();

    await openLead(page, "Halcyon Foods", "edit");
    const panels = form(page).locator('[data-name="contacts"] .sd-paneldynamic__panel-wrapper');
    await expect(panels).toHaveCount(2);

    await form(page).getByRole("button", { name: "Add a contact" }).click();
    await expect(panels).toHaveCount(3);

    await form(page).getByText("Tom Ashby", { exact: true }).click();
    await choose(page, panels.first().locator('[data-name="role"] .sd-dropdown'), "Economic buyer");
    await expect(warning).toHaveCount(0);
  });

  test("the budget amount is shown to managers only, on the same answers", async ({ page }) => {
    await page.goto("/leads");
    await openLead(page, "Northwind Labs");
    await nextPage(page);
    await nextPage(page);
    await expect(form(page).locator('[data-name="budgetConfirmed"]')).toBeVisible();
    await expect(form(page).locator('[data-name="budgetAmount"]')).toHaveCount(0);

    await signInAs(page, manager.name);
    // Same page, same record, a different reader.
    await expect(form(page).locator('[data-name="budgetAmount"] input')).toHaveValue("70000");
    await expect(formHeading(page)).toHaveText("View Northwind Labs");
  });

  test("a discount above 20% needs a manager to save", async ({ page }) => {
    await page.goto("/leads");
    await openLead(page, "Kestrel Freight", "edit");
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(form(page).getByText("Discounts above 20% need a manager.")).toBeVisible();
    await expect(formHeading(page)).toHaveText("Edit Kestrel Freight");

    await signInAs(page, manager.name);
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(formHeading(page)).toHaveText("View Kestrel Freight");
  });

  test("paging through a lead in edit mode is not a change", async ({ page }) => {
    await page.goto("/leads");
    await openLead(page, "Ridgeline Family Health", "edit");
    await nextPage(page);
    await nextPage(page);
    await listRow(page, "Halcyon Foods").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(formHeading(page)).toHaveText("View Halcyon Foods");
  });

  test("a lead the manager creates starts in their currency, owned by them", async ({ page }) => {
    await page.goto("/leads");
    await signInAs(page, manager.name);
    await page.getByRole("button", { name: "New lead" }).click();
    await expect(formHeading(page)).toHaveText("New lead");

    const account = form(page).locator('[data-name="accountName"] input');
    await account.fill("Tidewater Ports");
    await account.press("Tab");
    const contact = form(page).locator('[data-name="contacts"] [data-name="fullName"] input');
    if (!(await contact.isVisible())) {
      await form(page).locator('[data-name="contacts"] .sd-paneldynamic__panel-wrapper .sd-element__header').first().click();
    }
    await contact.fill("Jo Carver");
    await contact.press("Tab");

    await page.getByRole("button", { name: "Save changes" }).first().click();
    // Saving jumps to the first page with an error: the next step is required.
    const nextStep = form(page).locator('[data-name="nextStep"] input');
    await expect(nextStep).toBeVisible();
    await nextStep.fill("Discovery call");
    await nextStep.press("Tab");
    await form(page).locator('[data-name="nextStepDate"] input').fill("2026-10-01");
    await page.getByRole("button", { name: "Save changes" }).first().click();

    await expect(formHeading(page)).toHaveText("View Tidewater Ports");
    // The rail shows the stage and the deal value; the owner is in the form.
    const row = listRow(page, "Tidewater Ports");
    await expect(row).toContainText("€0.00");
    await expect(row).toContainText("New");
    await expect(page).toHaveURL(/\/leads\/LEAD-0007$/);
  });
});
