import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { test, expect } from "@playwright/test";
import bundledJson from "../src/examples/manifest.json";
import { BUNDLED_EXAMPLES, problemHref } from "../src/examples/entries";
import { loadExamples } from "../src/examples/load";
import { parseManifest } from "../src/examples/parse";
import { USE_CASES_URL } from "../src/lib/site";
import { navPages } from "../src/schemas/navigation";

/**
 * The examples manifest without a browser: the bundled copy is valid and names
 * real routes, the guard refuses what it should, and the loader falls back to
 * the bundled copy whenever a remote one cannot be used.
 */

const ROOT = path.join(__dirname, "..");
/** The one entry that is not a page here: an example on a host of its own. */
const ELSEWHERE = new Set(["healthcare"]);

test.describe("the bundled manifest", () => {
  test("parses", () => {
    expect(() => parseManifest(bundledJson)).not.toThrow();
    expect(BUNDLED_EXAMPLES.entries.length).toBeGreaterThan(0);
  });

  test("names only pages of this app, and the one example that lives elsewhere", () => {
    const ids = new Set<string>([...navPages.map((item) => item.id), ...ELSEWHERE]);
    for (const entry of BUNDLED_EXAMPLES.entries) expect(ids.has(entry.id), entry.id).toBe(true);
  });

  test("runs every page at a route this app serves, on both hosts", () => {
    for (const entry of BUNDLED_EXAMPLES.entries) {
      if (!entry.runUrl) {
        expect(ELSEWHERE.has(entry.id), `${entry.id} has no runUrl`).toBe(true);
        continue;
      }
      const page = navPages.find((item) => item.id === entry.id)!;
      for (const url of Object.values(entry.runUrl)) {
        const { pathname } = new URL(url);
        expect(pathname, `${entry.id}: ${url}`).toBe(page.path);
        expect(existsSync(path.join(ROOT, `src/app${pathname}/page.tsx`)), url).toBe(true);
      }
    }
  });

  test("links each example's section on the use-cases page, named like its route", () => {
    // `/work-orders` is `#work-orders`; the example on a host of its own is its id.
    for (const entry of BUNDLED_EXAMPLES.entries) {
      const expected = entry.runUrl ? new URL(entry.runUrl.mit).pathname.slice(1) : entry.id;
      expect(entry.useCaseAnchor, entry.id).toBe(expected);
      expect(problemHref(entry), entry.id).toBe(`${USE_CASES_URL}#${expected}`);
    }
  });
});

test.describe("parseManifest refuses", () => {
  const valid = () => structuredClone(bundledJson) as { version: number; entries: Record<string, unknown>[] };

  const cases: [string, (manifest: ReturnType<typeof valid>) => void, RegExp][] = [
    ["another version", (m) => (m.version = 2), /version/],
    ["a duplicate id", (m) => m.entries.push({ ...m.entries[0] }), /listed twice/],
    ["an entry related to itself", (m) => (m.entries[0].related = [m.entries[0].id]), /itself/],
    ["more than two related", (m) => (m.entries[0].related = ["workOrders", "embeddedChart", "starter"]), /more than 2/],
    ["a related id that is not an entry", (m) => (m.entries[0].related = ["nowhere"]), /not an entry/],
    ["both runUrl and url", (m) => (m.entries[0].url = "https://example.com/"), /exactly one/],
    ["neither runUrl nor url", (m) => delete m.entries[0].runUrl, /exactly one/],
    ["a URL that is not https", (m) => ((m.entries[0].runUrl as Record<string, string>).mit = "http://example.com/leads"), /https/],
    ["an entry that is not ready or not", (m) => delete m.entries[0].ready, /ready/],
  ];

  for (const [name, spoil, message] of cases) {
    test(name, () => {
      const manifest = valid();
      spoil(manifest);
      expect(() => parseManifest(manifest)).toThrow(message);
    });
  }
});

test.describe("loadExamples", () => {
  let server: Server;
  let base = "";
  const bodies: Record<string, string> = {};

  test.beforeAll(async () => {
    server = createServer((request, response) => {
      const body = bodies[request.url ?? ""];
      if (body === undefined) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { "content-type": "application/json" }).end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    bodies["/broken.json"] = "{ this is not json";
    const remote = structuredClone(bundledJson) as { entries: { id: string; name: string }[] };
    remote.entries[0].name = "Leads, from the remote copy";
    bodies["/valid.json"] = JSON.stringify(remote);
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  /** Runs `load` and returns what it logged through `console.error`. */
  async function logged<T>(load: () => Promise<T>): Promise<{ result: T; errors: string[] }> {
    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args.map(String).join(" "));
    try {
      return { result: await load(), errors };
    } finally {
      console.error = original;
    }
  }

  test("uses the bundled copy when no URL is set, and says nothing", async () => {
    const { result, errors } = await logged(() => loadExamples(""));
    expect(result).toBe(BUNDLED_EXAMPLES);
    expect(errors).toEqual([]);
  });

  test("falls back, with one line, when the URL is unreachable", async () => {
    const { result, errors } = await logged(() => loadExamples("http://127.0.0.1:9/x.json"));
    expect(result).toBe(BUNDLED_EXAMPLES);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("http://127.0.0.1:9/x.json");
  });

  test("falls back, with one line, when the answer is not JSON", async () => {
    const { result, errors } = await logged(() => loadExamples(`${base}/broken.json`));
    expect(result).toBe(BUNDLED_EXAMPLES);
    expect(errors).toHaveLength(1);
  });

  test("falls back, with one line, on a 404", async () => {
    const { result, errors } = await logged(() => loadExamples(`${base}/missing.json`));
    expect(result).toBe(BUNDLED_EXAMPLES);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("404");
  });

  test("uses a valid remote manifest", async () => {
    const { result, errors } = await logged(() => loadExamples(`${base}/valid.json`));
    expect(errors).toEqual([]);
    expect(result).not.toBe(BUNDLED_EXAMPLES);
    expect(result.entries[0].name).toBe("Leads, from the remote copy");
  });
});
