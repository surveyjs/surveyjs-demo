import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import { workOrderSeed } from "../src/schemas/data/work-order-seed";
import type { SurveyData } from "../src/schemas/types";
import { JOB_SHEET_BOXES, PARTS_ROWS } from "../src/features/full/work-order-boxes";
import {
  FONT_ASCENT,
  FONT_DESCENT,
  layoutWorkOrder,
  renderWorkOrderPdf,
  winAnsiSafe,
  type MeasureText,
} from "../src/features/full/work-order-pdf";

/**
 * The job sheet PDF, the full edition's `features.exportWorkOrderPdf`: the
 * printer puts every value inside its box on as many sheets as the parts need,
 * and Save as PDF on `/work-orders` downloads it. The data it prints is checked
 * in the shared `work-order-sheet.spec.ts`.
 */

const ASSETS = path.join(__dirname, "..", "assets", "work-order", "samples");
const BLANK_URL = "/samples/work-order-blank.pdf";
const BLANK = readFileSync(path.join(__dirname, "..", "public", BLANK_URL));

const SAMPLE_FILES = ["WO-2026-0130.json", "WO-2026-0131.json", "WO-2026-0132.json", "WO-2026-0120.json"];

function sampleData(file: string): SurveyData {
  return (JSON.parse(readFileSync(path.join(ASSETS, file), "utf8")) as { data: SurveyData }).data;
}

let courier: PDFFont;
let measure: MeasureText;

test.beforeAll(async () => {
  const doc = await PDFDocument.create();
  courier = await doc.embedFont(StandardFonts.Courier);
  measure = (text, size) => courier.widthOfTextAtSize(text, size);
});

test.describe("the printer's layout", () => {
  const records: [string, SurveyData][] = [
    ...workOrderSeed.map((record): [string, SurveyData] => [record.id, record.data]),
    ...SAMPLE_FILES.map((file): [string, SurveyData] => [file, sampleData(file)]),
  ];

  for (const [name, data] of records) {
    test(`${name}: every text run sits inside its box`, () => {
      const layout = layoutWorkOrder(data, measure);
      for (const run of layout.runs) {
        const box = JOB_SHEET_BOXES[run.box];
        expect(box, run.box).toBeTruthy();
        expect(box.page, run.box).toBe(run.page === 0 ? 1 : 2);
        const label = `${run.box}: ${run.kind === "text" ? run.text : "image"}`;
        if (run.kind === "text") {
          // The width pdf-lib will draw, not the one the layout remembered.
          const width = courier.widthOfTextAtSize(run.text, run.size);
          expect(run.x, label).toBeGreaterThanOrEqual(box.x);
          expect(run.x + width, label).toBeLessThanOrEqual(box.x + box.width + 0.01);
          expect(run.y - FONT_DESCENT * run.size, label).toBeGreaterThanOrEqual(box.y - 0.01);
          expect(run.y + FONT_ASCENT * run.size, label).toBeLessThanOrEqual(box.y + box.height + 0.01);
          expect(winAnsiSafe(run.text), label).toBe(run.text);
        } else {
          expect(run.x, label).toBeGreaterThanOrEqual(box.x);
          expect(run.x + run.width, label).toBeLessThanOrEqual(box.x + box.width + 0.01);
          expect(run.y, label).toBeGreaterThanOrEqual(box.y);
          expect(run.y + run.height, label).toBeLessThanOrEqual(box.y + box.height + 0.01);
        }
      }
    });
  }

  /** Each part row's number, in the order the runs print them, one entry per row. */
  function printedRows(data: SurveyData): number[] {
    const runs = layoutWorkOrder(data, measure).runs;
    return runs.flatMap((run) =>
      run.kind === "text" && run.box.endsWith(".partNumber") && run.row !== undefined ? [run.row] : [],
    );
  }

  function syntheticParts(count: number): SurveyData {
    return {
      jobNumber: "WO-2026-9999",
      parts: Array.from({ length: count }, (_, index) => ({
        partNumber: `P-${String(index + 1).padStart(3, "0")}`,
        description: `Synthetic part ${index + 1}`,
        quantity: 1,
        unitPrice: 1,
        linePrice: 1,
      })),
    };
  }

  test("the eight-row record takes two sheets, and every row prints once, in order", () => {
    const data = workOrderSeed.find((record) => record.id === "WO-2026-0118")!.data;
    expect(layoutWorkOrder(data, measure).pages).toEqual([1, 2]);
    expect(printedRows(data)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  test("choices print as a cross in their square, and a short value prints whole", () => {
    const data = workOrderSeed.find((record) => record.id === "WO-2026-0118")!.data;
    const runs = layoutWorkOrder(data, measure).runs;
    const text = (box: string) => runs.flatMap((run) => (run.kind === "text" && run.box === box ? [run.text] : []));
    for (const box of ["status.invoiced", "equipmentType.refrigeration", "warranty.no", "outcome.resolved"]) {
      expect(text(box), box).toEqual(["X"]);
    }
    expect(text("status.draft")).toEqual([]);
    expect(text("contactPhone")).toEqual(["(503) 555-0131"]);
  });

  test("a record with no parts takes one sheet", () => {
    const data = workOrderSeed.find((record) => record.id === "WO-2026-0121")!.data;
    expect(layoutWorkOrder(data, measure).pages).toEqual([1]);
  });

  test("a record past two continuation sheets takes four, and loses no row", () => {
    const count = PARTS_ROWS.first + 2 * PARTS_ROWS.continuation + 1;
    const data = syntheticParts(count);
    const layout = layoutWorkOrder(data, measure);
    expect(layout.pages).toEqual([1, 2, 2, 2]);
    expect(printedRows(data)).toEqual(Array.from({ length: count }, (_, index) => index));

    // No two runs share a box on the same sheet.
    const seen = new Set<string>();
    for (const run of layout.runs) {
      const key = `${run.page}:${run.box}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
    // Every sheet says which one it is.
    const sheets = layout.runs.filter((run) => run.kind === "text" && /(^|\.)sheetNumber$/.test(run.box));
    expect(sheets.map((run) => (run.kind === "text" ? `${run.page}:${run.text}` : ""))).toEqual(["0:1", "1:2", "2:3", "3:4"]);
    const counts = layout.runs.filter((run) => run.kind === "text" && /(^|\.)sheetCount$/.test(run.box));
    expect(counts.map((run) => (run.kind === "text" ? run.text : ""))).toEqual(["4", "4", "4", "4"]);
  });

  test("a long comment wraps, and its last line ends in an ellipsis", () => {
    const layout = layoutWorkOrder({ faultReported: "The unit trips. ".repeat(60) }, measure);
    const lines = layout.runs.filter((run) => run.box === "faultReported");
    expect(lines.length).toBeGreaterThan(1);
    const last = lines.at(-1)!;
    expect(last.kind === "text" && last.text.endsWith("...")).toBe(true);
  });

  test("a single-line value that does not fit ends in an ellipsis", () => {
    const layout = layoutWorkOrder({ serialNumber: "SN-".repeat(40) }, measure);
    const [run] = layout.runs.filter((item) => item.box === "serialNumber");
    expect(run.kind === "text" && run.text.endsWith("...")).toBe(true);
  });

  test("a record read from a document prints where its signature is", () => {
    const data = workOrderSeed.find((record) => record.id === "WO-2026-0120")!.data;
    const runs = layoutWorkOrder(data, measure).runs.filter((run) => run.box === "customerSignature");
    expect(runs.every((run) => run.kind === "text")).toBe(true);
    const text = runs.map((run) => (run.kind === "text" ? run.text : "")).join(" ");
    expect(text).toContain("Signed on the original: work-order-0120-scan.jpg");
    expect(text).toContain("2026-09-02 15:20 UTC");
  });

  test("a signed record draws the image, and a blank one draws nothing there", () => {
    const signed = workOrderSeed.find((record) => record.id === "WO-2026-0118")!.data;
    expect(layoutWorkOrder(signed, measure).runs.filter((run) => run.kind === "image")).toHaveLength(1);
    const scheduled = workOrderSeed.find((record) => record.id === "WO-2026-0122")!.data;
    expect(layoutWorkOrder(scheduled, measure).runs.filter((run) => run.box === "customerSignature")).toHaveLength(0);
  });

  test("text pdf-lib cannot encode is replaced, not thrown", async () => {
    expect(winAnsiSafe("−10 °F → “ok” … Łódź")).toBe('-10 °F -> "ok" ... ?ód?');
    const bytes = await renderWorkOrderPdf({ jobNumber: "WO-2026-0001", faultReported: "−10 °F → “ok” Łódź 冷" }, BLANK);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  test("the printed PDFs have the sheets the layout planned", async () => {
    const first = workOrderSeed.find((record) => record.id === "WO-2026-0118")!.data;
    const none = workOrderSeed.find((record) => record.id === "WO-2026-0121")!.data;
    const long = syntheticParts(PARTS_ROWS.first + 2 * PARTS_ROWS.continuation + 1);
    for (const [data, pages] of [[first, 2], [none, 1], [long, 4]] as const) {
      const doc = await PDFDocument.load(await renderWorkOrderPdf(data, BLANK));
      expect(doc.getPageCount()).toBe(pages);
    }
  });
});

test.describe("on /work-orders", () => {
  /** The list: the first table on the page; the parts matrix is a table too. */
  function listRow(page: Page, id: string) {
    return page.getByRole("table").first().getByRole("row", { name: new RegExp(id) });
  }

  test("the blank job sheet is served", async ({ request }) => {
    expect((await request.get(BLANK_URL)).status()).toBe(200);
  });

  for (const [id, pages] of [["WO-2026-0118", 2], ["WO-2026-0121", 1]] as const) {
    test(`Save as PDF prints ${id} onto the job sheet, ${pages} sheet${pages === 1 ? "" : "s"}`, async ({ page }) => {
      await page.goto("/work-orders");
      await listRow(page, id).getByRole("cell").first().click();
      await expect(page.getByRole("heading", { level: 2, name: `View ${id}` })).toBeVisible();

      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Save as PDF" }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe(`job-sheet-${id.toLowerCase()}.pdf`);
      const doc = await PDFDocument.load(await readFile((await file.path())!));
      expect(doc.getPageCount()).toBe(pages);
    });
  }
});
