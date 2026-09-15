import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { createSurveyModel } from "../src/schemas/createSurveyModel";
import { workOrderJson } from "../src/schemas/work-order";
import { workOrderSeed } from "../src/schemas/data/work-order-seed";
import { getRecordCollection } from "../src/schemas/records";
import type { SurveyData } from "../src/schemas/types";

/**
 * The job sheet's data without a browser: the seed's stored totals are the
 * definition's, the scan seed record 0120 links shows that record, and the
 * samples add up. The printer that puts a record back onto the sheet is the full
 * edition's, and so is its spec.
 */

const workOrders = getRecordCollection("workOrders");
const ASSETS = path.join(__dirname, "..", "assets", "work-order", "samples");

interface SampleSheet {
  readonly signature: string;
  readonly hand?: boolean;
  readonly data: SurveyData;
}

function sheet(file: string): SampleSheet {
  return JSON.parse(readFileSync(path.join(ASSETS, file), "utf8")) as SampleSheet;
}

const SAMPLE_FILES = ["WO-2026-0130.json", "WO-2026-0131.json", "WO-2026-0132.json", "WO-2026-0120.json"];

/** The calculated values, as the definition computes them from the entered ones. */
function recomputed(data: SurveyData): SurveyData {
  const model = createSurveyModel(workOrderJson, { data, mode: "display" });
  return model.data as SurveyData;
}

const CALCULATED = ["hoursOnSite", "partsTotal", "laborTotal", "total"] as const;

test.describe("seed and samples", () => {
  for (const record of workOrderSeed) {
    test(`${record.id} stores the totals the definition computes`, () => {
      const model = recomputed(record.data);
      for (const key of CALCULATED) {
        expect(model[key], key).toEqual(record.data[key]);
      }
      const parts = (record.data.parts ?? []) as SurveyData[];
      const modelParts = (model.parts ?? []) as SurveyData[];
      parts.forEach((row, index) => expect(modelParts[index].linePrice, `parts[${index}]`).toBe(row.linePrice));
      // The list recomputes the total on its own, and agrees.
      expect(workOrders.toColumns(record.id, record.data).total).toBe(record.data.total);
    });
  }

  for (const file of SAMPLE_FILES) {
    test(`${file} adds up`, () => {
      const { data } = sheet(file);
      const model = recomputed(data);
      for (const key of CALCULATED) expect(model[key], key).toEqual(data[key]);
      const parts = (data.parts ?? []) as SurveyData[];
      parts.forEach((row, index) =>
        expect(((model.parts as SurveyData[])[index]).linePrice, `parts[${index}]`).toBe(row.linePrice),
      );
    });
  }

  test("the scan WO-2026-0120 links shows exactly that record", () => {
    const printed = sheet("WO-2026-0120.json").data;
    const stored = workOrderSeed.find((record) => record.id === "WO-2026-0120")!.data;
    const { sourceDocument, importedAt, customerSignature, ...onPaper } = stored;
    expect(sourceDocument).toBeTruthy();
    expect(importedAt).toBeTruthy();
    expect(customerSignature).toBeUndefined();
    expect(printed).toEqual(onPaper);
  });

  test("no sample is a seed record", () => {
    const ids = new Set(workOrderSeed.map((record) => record.id));
    for (const file of SAMPLE_FILES.slice(0, 3)) expect(ids.has(sheet(file).data.jobNumber as string)).toBe(false);
  });
});
