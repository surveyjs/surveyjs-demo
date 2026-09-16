import { test, expect, type Page, type Route } from "@playwright/test";
import { workOrderSampleDocuments } from "../src/components/extract/sample-documents";
import { getFormNavItem } from "../src/schemas/navigation";
import { getRecordCollection } from "../src/schemas/records";
import { workOrderSeed } from "../src/schemas/data/work-order-seed";

/**
 * The paper way into the work order records: a PDF, a scan or a photo of a
 * filled job sheet goes to `/api/extract`, and the answers come back keyed by
 * question name.
 *
 * These tests deliberately never reach an LLM: the endpoint is asserted on the
 * input it rejects, and the round trip runs against a stubbed response, so the
 * suite costs nothing and needs no key.
 */

const workOrders = getRecordCollection("workOrders");
const workOrdersNav = getFormNavItem("workOrders");

/** The header button that opens the panel. Exact: the panel's own "Add from your document" must not match. */
async function openPanel(page: Page) {
  await page.getByRole("button", { name: "Add from document", exact: true }).click();
  await expect(page).toHaveURL(/\/work-orders\/from-document$/);
}

test("the work orders page offers three sample documents and an upload", async ({ page }) => {
  await page.goto("/work-orders");
  await openPanel(page);

  for (const action of ["Add from PDF", "Add from photo", "Add from scan"]) {
    await expect(page.getByRole("button", { name: action })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Add from your document" })).toBeVisible();
  await expect(page.getByText(/Supported formats: PDF, PNG, JPG, WEBP/)).toBeVisible();

  // The thumbnail opens the page full size, and the original is downloadable
  // from there - it ships with the template rather than being fetched.
  const [pdf] = workOrderSampleDocuments;
  await page.getByRole("button", { name: `Open ${pdf.label} (${pdf.kind}) full size` }).click();
  await expect(page.getByRole("link", { name: "Download original" })).toHaveAttribute("href", pdf.file);
  await page.keyboard.press("Escape");

  const files = new Set([
    ...workOrderSampleDocuments.flatMap((sample) => [sample.file, sample.preview, sample.full]),
    "/samples/work-order-0120-scan.jpg",
  ]);
  for (const file of files) {
    expect((await page.request.get(file)).status(), file).toBe(200);
  }
});

test("the starter form is a plain form, with no extraction on it", async ({ page }) => {
  await page.goto("/starter");

  await expect(page.locator(".sd-root-modern").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add from/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add from your document" })).toHaveCount(0);
});

test("the extract endpoint rejects a request with no document", async ({ request }) => {
  const response = await request.post("/api/extract", {
    multipart: { formId: "work-order" },
  });

  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("No document");
});

/** When the server read the stubbed document. */
const READ_AT = "2026-09-15T10:42";

/**
 * What a model might return for sample 1: a completed sheet at $120 an hour, a
 * blank phone box, and an attempt to set the two fields only the app may set.
 */
function extracted(jobNumber: string) {
  return {
    jobNumber,
    status: "completed",
    visitDate: "2026-09-14",
    customerName: "Ashgrove District Schools",
    contactPhone: null,
    siteAddress: "Ashgrove Middle School, boiler room\n3300 SE Harold St, Portland, OR 97202",
    faultReported: "Boiler 2 locking out on flame failure before school opens.",
    laborHours: 2,
    laborRate: 120,
    parts: [{ partNumber: "IGN-399", description: "Hot surface igniter", quantity: 1, unitPrice: 68, linePrice: 68 }],
    sourceDocument: [{ name: "forged.pdf", type: "application/pdf", content: "https://example.com/forged.pdf" }],
    importedAt: "1999-01-01T00:00",
  };
}

/** 68 for the part, plus 2 hours at the sheet's own $120. At the default $85 it would be $238.00. */
const TOTAL_AT_120 = "$308.00";

async function stubExtraction(page: Page, jobNumber: string) {
  await page.route("**/api/extract", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: extracted(jobNumber), readAt: READ_AT }),
    }),
  );
}

function formHeading(page: Page) {
  return page.getByRole("heading", { level: 2 }).filter({ hasText: /^(View|Edit|New) / });
}

function rail(page: Page) {
  return page.getByRole("navigation", { name: workOrdersNav.label, exact: true });
}

/** One work order in the rail. The job number is in the link's text. */
function listRow(page: Page, id: string) {
  return rail(page).getByRole("link", { name: new RegExp(id) });
}

test("a document adds a draft that keeps its printed job number and rate, and links its original", async ({ page }) => {
  await stubExtraction(page, "WO-2026-0130");
  await page.goto("/work-orders");
  await openPanel(page);
  await page.getByRole("button", { name: "Add from PDF" }).click();

  // In the list as a draft, under the job number printed on the sheet, and open
  // for correction at its own URL - no Save first.
  const row = listRow(page, "WO-2026-0130");
  await expect(row).toBeVisible();
  await expect(row.locator('[data-slot="badge"]')).toHaveText("Draft");
  await expect(formHeading(page)).toHaveText("Edit WO-2026-0130");
  await expect(page).toHaveURL(/\/work-orders\/WO-2026-0130$/);
  await expect(page.getByRole("button", { name: "Save changes" }).first()).toBeVisible();

  // Where it came from is the app's to say, not the model's.
  await expect(page.locator('[data-name="status"]')).toContainText("Draft");
  const link = page.locator('[data-name="sourceDocument"] a');
  await expect(link).toHaveAttribute("href", "/samples/work-order-0130.pdf");
  await expect(page.locator('[data-name="sourceDocument"] .sd-file')).toHaveClass(/sd-file--readonly/);
  const readAt = page.locator('[data-name="importedAt"] input');
  await expect(readAt).toHaveValue(READ_AT);
  await expect(readAt).toHaveAttribute("readonly", "");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator('[data-name="laborRate"] input')).toHaveValue("120");
  await expect(page.locator('[data-name="total"]')).toContainText(TOTAL_AT_120);
});

test("each document is read once per browser, and the others stay loadable", async ({ page }) => {
  await stubExtraction(page, "WO-2026-0130");
  await page.goto("/work-orders");
  await openPanel(page);
  await page.getByRole("button", { name: "Add from PDF" }).click();
  await expect(formHeading(page)).toHaveText("Edit WO-2026-0130");

  // Back on the panel, after a reload too: the PDF is marked, the rest are not.
  for (const load of ["in the same tab", "after a reload"]) {
    if (load === "after a reload") await page.goto("/work-orders/from-document");
    else await openPanel(page);
    await expect(page.getByRole("button", { name: "Add from PDF" })).toHaveCount(0);
    await expect(page.getByText("Already read into a work order")).toHaveCount(1);
    await expect(page.getByText("Loaded", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Add from photo" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Add from scan" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Add from your document" })).toBeEnabled();
  }
  expect(await page.evaluate(() => localStorage.getItem("sjs-demo-extracted:work-order"))).toBe(
    JSON.stringify([workOrderSampleDocuments[0].id]),
  );
});

test("a browser that used the old one-reading lock keeps that document marked, and nothing else", async ({ page }) => {
  const [pdf] = workOrderSampleDocuments;
  await page.addInitScript((id) => localStorage.setItem("sjs-demo-extracted:work-order", id), pdf.id);
  await page.goto("/work-orders/from-document");
  await expect(page.getByText("Already read into a work order")).toHaveCount(1);
  await expect(page.getByRole("button", { name: pdf.action })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add from photo" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Add from your document" })).toBeEnabled();
});

test("an upload is stored, and its link opens the same bytes", async ({ page }) => {
  await stubExtraction(page, "WO-2026-0130");
  await page.goto("/work-orders");
  await openPanel(page);

  const bytes = Buffer.from("%PDF-1.4\n% a job sheet of your own\n");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add from your document" }).click();
  await (await chooser).setFiles({ name: "my-job-sheet.pdf", mimeType: "application/pdf", buffer: bytes });

  await expect(formHeading(page)).toHaveText("Edit WO-2026-0130");
  const href = await page.locator('[data-name="sourceDocument"] a').getAttribute("href");
  expect(href).toMatch(/^\/api\/storage\/documents\/[0-9a-f-]{36}$/);
  const opened = await page.evaluate(async (url) => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), href!);
  expect(Buffer.from(opened).equals(bytes)).toBe(true);
});

test("a document whose job number is already stored gets the next free one", async ({ page }) => {
  const taken = workOrderSeed[0].id;
  const next = workOrders.newId(workOrderSeed.map((record) => record.id));
  await stubExtraction(page, taken);
  await page.goto("/work-orders");
  await openPanel(page);
  await page.getByRole("button", { name: "Add from scan" }).click();

  await expect(formHeading(page)).toHaveText(`Edit ${next}`);
  await expect(listRow(page, next).locator('[data-slot="badge"]')).toHaveText("Draft");
  // The stored record with that number is untouched: one of it, with its total.
  await expect(listRow(page, taken)).toHaveCount(1);
  await listRow(page, taken).click();
  await expect(formHeading(page)).toHaveText(`View ${taken}`);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator('[data-name="total"]')).toContainText("$1,195.25");
});

test("while a document is being read, nothing in the page leaves the panel", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/extract", async (route: Route) => {
    await held;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: extracted("WO-2026-0130"), readAt: READ_AT }),
    });
  });

  await page.goto("/work-orders");
  // A record URL first, so Back has somewhere inside the page to go.
  await listRow(page, "WO-2026-0119").click();
  await expect(page).toHaveURL(/\/work-orders\/WO-2026-0119$/);
  await openPanel(page);
  await page.getByRole("button", { name: "Add from PDF" }).click();

  const close = page.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeDisabled();
  // The rail's New, and the dropdown's New and trigger, hidden at this width.
  for (const name of [`New ${workOrders.noun.one}`, `Choose a ${workOrders.noun.one}`]) {
    const buttons = page.getByRole("button", { name, includeHidden: true });
    expect(await buttons.count()).toBeGreaterThan(0);
    for (let index = 0; index < (await buttons.count()); index++) {
      await expect(buttons.nth(index)).toBeDisabled();
    }
  }

  // A rail link is marked disabled, and a plain click on it does nothing.
  const other = listRow(page, "WO-2026-0120");
  await expect(other).toHaveAttribute("aria-disabled", "true");
  await other.click({ force: true });
  await expect(page).toHaveURL(/\/work-orders\/from-document$/);
  await expect(page.locator(".sd-root-modern")).toHaveCount(0);

  // Back cannot be blocked, so the panel's URL is put back.
  await page.goBack();
  await expect(page).toHaveURL(/\/work-orders\/from-document$/);
  await expect(close).toBeVisible();
  await expect(page.locator(".sd-root-modern")).toHaveCount(0);

  release();
  await expect(formHeading(page)).toHaveText("Edit WO-2026-0130");
  await expect(page).toHaveURL(/\/work-orders\/WO-2026-0130$/);
});
