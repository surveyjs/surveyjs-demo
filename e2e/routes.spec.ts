import { existsSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { otherEditionHref, pageSourcePath } from "../src/lib/routes";
import { getFormNavItem, navPages } from "../src/schemas/navigation";
import { recordCollections } from "../src/schemas/records";

/**
 * The route helpers the dock builds its links from, without a browser.
 */

const ROOT = path.join(__dirname, "..");

test("otherEditionHref keeps the host, the base path and the pathname", () => {
  expect(otherEditionHref("http://localhost:3001", "/work-orders")).toBe("http://localhost:3001/work-orders");
  expect(otherEditionHref("https://full.example/", "/starter")).toBe("https://full.example/starter");
  expect(otherEditionHref("https://example.com/demos/full", "/work-orders")).toBe(
    "https://example.com/demos/full/work-orders",
  );
  expect(otherEditionHref("https://example.com/demos/full//", "/work-orders")).toBe(
    "https://example.com/demos/full/work-orders",
  );
});

test("pageSourcePath maps a demo route to the file that serves it", () => {
  expect(pageSourcePath("/work-orders")).toBe("src/app/work-orders/page.tsx");
  // A record's URL is the same page.
  expect(pageSourcePath("/work-orders/WO-2026-0118")).toBe("src/app/work-orders/page.tsx");
  expect(pageSourcePath("/chart")).toBe("src/app/chart/page.tsx");
  expect(pageSourcePath("/configure")).toBeUndefined();
  expect(pageSourcePath("/")).toBeUndefined();
});

test("every page in the registry is served by the file pageSourcePath names", () => {
  for (const item of navPages) {
    const file = pageSourcePath(item.path);
    expect(file, item.path).toBeDefined();
    expect(existsSync(path.join(ROOT, file!)), `${file} is not on disk`).toBe(true);
  }
});

test("every form page says what finishing it does: a records page saves, every other completes", () => {
  const recordSchemas = new Set(Object.values(recordCollections).map((collection) => collection.schemaId));
  for (const item of navPages) {
    if (!item.schemaId) {
      expect(item.finish, item.id).toBeUndefined();
      continue;
    }
    expect(getFormNavItem(item.id).finish, item.id).toBe(recordSchemas.has(item.schemaId) ? "save" : "complete");
  }
});
