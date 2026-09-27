import { existsSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { howHref, isHowRoute, otherEditionHref, pageSourcePath } from "../src/lib/routes";
import { navPages } from "../src/schemas/navigation";

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
    // And its explainer has a route of its own.
    expect(existsSync(path.join(ROOT, `src/app${howHref(item.path)}/page.tsx`)), howHref(item.path)).toBe(true);
  }
});

test("pageSourcePath has nothing to say about an explainer", () => {
  // The route file is three lines around `HowPage`; what a reader of that
  // page wants is `how/<route>.md`, which its own links already reach.
  expect(pageSourcePath("/leads/how")).toBeUndefined();
  expect(pageSourcePath("/work-orders/how")).toBeUndefined();
  expect(pageSourcePath("/chart/how")).toBeUndefined();
});

test("isHowRoute is a registered page's /how, and nothing else", () => {
  for (const item of navPages) expect(isHowRoute(howHref(item.path))).toBe(true);
  expect(isHowRoute("/how")).toBe(false);
  expect(isHowRoute("/work-orders")).toBe(false);
  // A record whose id looked like the segment is not an explainer.
  expect(isHowRoute("/work-orders/WO-2026-0118/how")).toBe(false);
  expect(isHowRoute("/configure/how")).toBe(false);
});
