import { randomUUID } from "node:crypto";
import { test, expect, type APIRequest, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { checkoutJson } from "../src/schemas/checkout";
import { workOrderJson } from "../src/schemas/work-order";
import { SHORT_CHECKOUT } from "./short-checkout";
import { getFormNavItem } from "../src/schemas/navigation";
import { getRecordCollection, recordTitle } from "../src/schemas/records";
import { schemaRegistry } from "../src/schemas";
import {
  MAX_VALUE_BYTES,
  openDatabase,
  SCHEMA_VERSION,
  TEMPLATE_UID,
  type DemoStore,
} from "../src/storage/backend/sqlite";
import { READ_ONLY_MESSAGE } from "../src/storage/access";
import { listResults } from "../src/storage/survey-results";
import { startSession } from "./session";

/**
 * Per-visitor storage, end to end: who gets a cookie and a row, what the server
 * renders, the two resets, the caps, uploaded originals, a browser that blocks
 * cookies, and failures the page has to survive.
 *
 * The server and this process share one database file (see
 * `playwright.config.ts`), so what a browser did is checked with SQL here. The
 * spec only reads it; opening it rewrites the template, which is idempotent.
 * Every test runs in its own browser context, so every test is its own visitor.
 */

const leads = getRecordCollection("leads");
const workOrders = getRecordCollection("workOrders");
const leadsNav = getFormNavItem("leads");
const workOrdersNav = getFormNavItem("workOrders");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LIMIT_MESSAGE = "This demo stores up to 1 MB per form, 8 MB per document and 50 MB per visitor.";

function withDatabase<T>(read: (store: DemoStore) => T): T {
  const store = openDatabase(process.env.DATABASE_PATH!, SCHEMA_VERSION);
  try {
    return read(store);
  } finally {
    store.close();
  }
}

async function visitorOf(context: BrowserContext): Promise<string | undefined> {
  return (await context.cookies()).find((cookie) => cookie.name === "demo_uid")?.value;
}

function formHeading(page: Page) {
  return page.getByRole("heading", { level: 2 }).filter({ hasText: /^(View|Edit|New) / });
}

/** The records page's error line; Next.js keeps an empty `role="alert"` announcer of its own. */
function storageAlert(page: Page) {
  return page.locator('p[role="alert"]');
}

function rail(page: Page, label: string) {
  return page.getByRole("navigation", { name: label, exact: true });
}

/** The first lead, as the template holds it. */
async function firstLead() {
  const [row] = await listResults("leads");
  return { id: row.id, title: recordTitle(leads, row) };
}

async function waitForEditor(page: Page) {
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 45_000 });
}

async function setEditorText(page: Page, json: unknown) {
  await page.evaluate((source) => {
    const monaco = (window as unknown as { monaco: typeof import("monaco-editor") }).monaco;
    monaco.editor.getModels()[0].setValue(source);
  }, JSON.stringify(json, null, 2));
}

/** A request context with a cookie header of our choosing and no jar of its own. */
async function withCookie(
  playwright: { request: APIRequest },
  baseURL: string,
  value: string,
): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL, extraHTTPHeaders: { cookie: `demo_uid=${value}` } });
}

test.describe("who is stored", () => {
  test("a page read sets no cookie; the handshake sets one and stores nothing", async ({ request, playwright, baseURL }) => {
    const { title } = await firstLead();
    const page = await request.get("/leads");
    expect(page.headers()["set-cookie"]).toBeUndefined();
    expect(await page.text()).toContain(title);

    const first = await request.post("/api/storage/session");
    expect(await first.json()).toEqual({ ok: false });
    const issued = /demo_uid=([^;]+)/.exec(first.headers()["set-cookie"] ?? "")?.[1];
    expect(issued).toMatch(UUID);
    const second = await request.post("/api/storage/session");
    expect(await second.json()).toEqual({ ok: true });
    expect(second.headers()["set-cookie"]).toBeUndefined();
    expect(withDatabase((store) => store.visitorExists(issued!))).toBe(false);

    // A well-formed id nobody ever wrote under reads the template and creates nothing.
    const unknown = randomUUID();
    const stranger = await withCookie(playwright, baseURL!, unknown);
    for (const path of ["/leads", "/starter", "/api/storage/results/leads", "/api/storage/definitions/checkout"]) {
      expect((await stranger.get(path)).status(), path).toBe(200);
    }
    expect(await (await stranger.get("/api/storage/results/leads")).json()).toHaveLength(leads.seed.length);
    await stranger.dispose();
    expect(withDatabase((store) => store.visitorExists(unknown))).toBe(false);
  });

  test("a malformed or reserved cookie never reaches SQL, and the handshake replaces it", async ({ playwright, baseURL }) => {
    for (const value of ["../x", "1 OR 1=1", TEMPLATE_UID]) {
      const context = await withCookie(playwright, baseURL!, value);
      const list = await context.get("/api/storage/results/leads");
      expect(await list.json(), value).toHaveLength(leads.seed.length);

      const write = await context.put(`/api/storage/results/leads/${leads.seed[0].id}`, {
        data: { data: { accountName: "Written with a forged cookie" } },
      });
      expect(write.status(), value).toBe(403);
      expect((await write.json()).error).toBe(READ_ONLY_MESSAGE);

      const session = await context.post("/api/storage/session");
      expect(await session.json()).toEqual({ ok: false });
      const fresh = /demo_uid=([^;]+)/.exec(session.headers()["set-cookie"] ?? "")?.[1];
      expect(fresh).toMatch(UUID);
      expect(fresh).not.toBe(TEMPLATE_UID);
      await context.dispose();
    }
    // The template still holds the seed.
    const stored = withDatabase((store) => store.getRecord(TEMPLATE_UID, "leads", leads.seed[0].id));
    expect(stored?.data).toEqual(leads.seed[0].data);
  });
});

test.describe("what the server renders", () => {
  test("a definition saved on /definition is in the server HTML of /starter", async ({ page, request }) => {
    test.slow();
    const loaded = page.waitForResponse((response) =>
      response.url().endsWith("/api/storage/definitions/checkout") && response.request().method() === "GET",
    );
    await page.goto("/definition?form=checkout");
    await waitForEditor(page);
    // The editor reads the stored definition after mount; edit only after it has.
    await loaded;
    // A whole definition: the route lints it and runs the checkout suite before
    // it stores anything, so a fixture has to be valid for the form it claims to
    // be. The short checkout with one question added is (see e2e/short-checkout.ts).
    const edited = structuredClone(SHORT_CHECKOUT) as typeof SHORT_CHECKOUT & {
      pages: { elements: unknown[] }[];
    };
    edited.title = "Stored by the storage spec";
    edited.pages[0].elements.unshift({
      type: "text",
      name: "q1",
      title: "A question stored on the server",
    });
    await setEditorText(page, edited);
    await page.getByRole("button", { name: "Save and quit" }).click();
    await expect(page).toHaveURL(/\/starter$/);

    const response = await page.reload();
    expect(await response!.text()).toContain("A question stored on the server");
    await expect(page.getByText("A question stored on the server")).toBeVisible();
    // No loading state: the edit arrived with the HTML.
    await expect(page.getByRole("status")).toHaveCount(0);

    // Nobody else sees it.
    expect(await (await request.get("/starter")).text()).not.toContain("A question stored on the server");
  });

  test("an edited record persists, and the first write copied the whole template", async ({ page, context }) => {
    await page.goto("/work-orders/WO-2026-0119");
    await expect(formHeading(page)).toHaveText("View WO-2026-0119");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const customer = page.locator('[data-name="customerName"] input').first();
    await customer.fill("Stored Customer Ltd");
    await customer.press("Tab");
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(formHeading(page)).toHaveText("View WO-2026-0119");

    await page.reload();
    await expect(rail(page, workOrdersNav.label).getByRole("link", { name: /WO-2026-0119/ })).toContainText(
      "Stored Customer Ltd",
    );

    const uid = (await visitorOf(context))!;
    const { definitions, records } = withDatabase((store) => ({
      definitions: store.db.prepare("SELECT form_id FROM definitions WHERE uid = ?").all(uid),
      records: store.db
        .prepare("SELECT form_id, record_id, json, updated_at FROM data_records WHERE uid = ? ORDER BY rowid")
        .all(uid) as { form_id: string; record_id: string; json: string; updated_at: string }[],
    }));
    expect(definitions).toHaveLength(Object.keys(schemaRegistry).length);
    expect(records.filter((row) => row.form_id === "leads")).toHaveLength(leads.seed.length);
    expect(records.filter((row) => row.form_id === "workOrders")).toHaveLength(workOrders.seed.length);

    const edited = records.find((row) => row.record_id === "WO-2026-0119")!;
    expect(JSON.parse(edited.json).customerName).toBe("Stored Customer Ltd");
    // The rest carry the first-write copy's one timestamp; the edit is no older.
    const copied = new Set(records.filter((row) => row !== edited).map((row) => row.updated_at));
    expect(copied.size).toBe(1);
    expect(edited.updated_at >= [...copied][0]).toBe(true);
  });

  test("two tabs saving different records at once both persist", async ({ context }) => {
    const [one, two] = [await context.newPage(), await context.newPage()];
    await startSession(one.request);
    const [a, b] = leads.seed;
    const responses = await Promise.all([
      one.request.put(`/api/storage/results/leads/${a.id}`, { data: { data: { ...a.data, accountName: "Tab one" } } }),
      two.request.put(`/api/storage/results/leads/${b.id}`, { data: { data: { ...b.data, accountName: "Tab two" } } }),
    ]);
    for (const response of responses) expect(response.status()).toBe(200);

    const uid = (await visitorOf(context))!;
    const { names, integrity } = withDatabase((store) => ({
      names: [store.getRecord(uid, "leads", a.id)?.data.accountName, store.getRecord(uid, "leads", b.id)?.data.accountName],
      integrity: store.db.prepare("PRAGMA integrity_check").get() as { integrity_check: string },
    }));
    expect(names).toEqual(["Tab one", "Tab two"]);
    expect(integrity.integrity_check).toBe("ok");
  });
});

test.describe("resets", () => {
  test("Reset on /definition restores that one form, and nothing else", async ({ page }) => {
    test.slow();
    await startSession(page.request);
    const lead = leads.seed[0];
    const edits = [
      // Whole definitions, retitled: the route checks what it is asked to store,
      // so "the title only" is no longer a definition anybody may save.
      page.request.put("/api/storage/definitions/checkout", { data: { json: { ...checkoutJson, title: "Edited checkout" } } }),
      page.request.put("/api/storage/definitions/work-order", { data: { json: { ...workOrderJson, title: "Edited work order" } } }),
      page.request.put(`/api/storage/results/leads/${lead.id}`, { data: { data: { ...lead.data, accountName: "Edited lead" } } }),
    ];
    for (const edit of edits) expect((await edit).ok()).toBe(true);

    await page.goto("/definition?form=checkout");
    await waitForEditor(page);
    await page.getByRole("button", { name: "Reset" }).click();

    const title = async (form: string) =>
      ((await (await page.request.get(`/api/storage/definitions/${form}`)).json()) as { json: { title?: string } }).json.title;
    await expect.poll(() => title("checkout")).toBe(checkoutJson.title);
    expect(await title("work-order")).toBe("Edited work order");
    const record = await page.request.get(`/api/storage/results/leads/${lead.id}`);
    expect((await record.json()).data.accountName).toBe("Edited lead");
  });

  test("Reset demo data is a new visitor: the old rows are gone and the seed is back", async ({ page, context }) => {
    const { id, title } = await firstLead();
    await page.goto("/leads");
    await startSession(page.request);
    const lead = leads.seed.find((item) => item.id === id)!;
    await page.request.put(`/api/storage/results/leads/${id}`, {
      data: { data: { ...lead.data, accountName: "Before the reset" } },
    });
    await page.reload();
    await expect(formHeading(page)).toHaveText("View Before the reset");
    const before = (await visitorOf(context))!;

    await page.getByRole("button", { name: "Reset demo data" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Reset demo data?");
    await dialog.getByRole("button", { name: "Reset demo data" }).click();

    await expect(formHeading(page)).toHaveText(`View ${title}`);
    await expect(page).toHaveURL(new RegExp(`${leadsNav.path}$`));
    const after = await visitorOf(context);
    expect(after).toMatch(UUID);
    expect(after).not.toBe(before);
    expect(withDatabase((store) => store.visitorExists(before))).toBe(false);
  });

  test("deleted records stay deleted, and an emptied list keeps Reset demo data", async ({ page }) => {
    await page.goto("/work-orders");
    const records = rail(page, workOrdersNav.label).getByRole("link");
    await expect(records).toHaveCount(workOrders.seed.length);

    for (let left = workOrders.seed.length; left > 0; left--) {
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await expect(records).toHaveCount(left - 1);
      if (left === workOrders.seed.length) {
        // One deleted seed record, across a reload.
        await page.reload();
        await expect(records).toHaveCount(left - 1);
      }
    }

    await page.reload();
    await expect(records).toHaveCount(0);
    await expect(page.getByText("No work orders yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset demo data" })).toBeEnabled();
  });
});

test.describe("caps", () => {
  test("a definition over 1 MB is refused, and the editor says so", async ({ page, request }) => {
    test.slow();
    await startSession(request);
    const big = await request.put("/api/storage/definitions/checkout", {
      data: { json: { title: "x".repeat(MAX_VALUE_BYTES + 100_000) } },
    });
    expect(big.status()).toBe(413);
    expect((await big.json()).error).toBe(LIMIT_MESSAGE);

    // Characters under the cap, bytes over it: every "é" is two bytes.
    const wide = await request.put("/api/storage/definitions/checkout", {
      data: { json: { title: "é".repeat(600_000) } },
    });
    expect(wide.status()).toBe(413);

    // In the editor: the save leaves the browser as typed and is padded on the
    // way, so the refusal is the server's own.
    await page.route("**/api/storage/definitions/checkout", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      await route.continue({ postData: JSON.stringify({ json: { title: "x".repeat(1_150_000) } }) });
    });
    await page.goto("/definition?form=checkout");
    await waitForEditor(page);
    await page.getByRole("button", { name: "Save and quit" }).click();
    await expect(page.getByText(LIMIT_MESSAGE)).toBeVisible();
    await expect(page).toHaveURL(/\/definition\?form=checkout$/);
  });

  test("a record over 1 MB is refused, and the records page says so", async ({ page }) => {
    const { title } = await firstLead();
    await page.route("**/api/storage/results/leads/*", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      const { data } = JSON.parse(route.request().postData()!);
      await route.continue({ postData: JSON.stringify({ data: { ...data, padding: "x".repeat(1_150_000) } }) });
    });
    await page.goto("/leads");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).first().click();

    await expect(storageAlert(page)).toHaveText(LIMIT_MESSAGE);
    await expect(formHeading(page)).toHaveText(`Edit ${title}`);
  });

  test("a 9 MB upload is refused before anything is stored", async ({ playwright, baseURL }) => {
    const uid = randomUUID();
    const context = await withCookie(playwright, baseURL!, uid);
    const bytes = Buffer.alloc(9 * 1_048_576, 0x20);
    bytes.write("%PDF-1.4\n");
    const response = await context.post("/api/storage/documents", {
      multipart: { collection: "workOrders", file: { name: "huge.pdf", mimeType: "application/pdf", buffer: bytes } },
    });
    expect(response.status()).toBe(413);
    await context.dispose();
    expect(
      withDatabase((store) => store.db.prepare("SELECT COUNT(*) AS n FROM documents WHERE uid = ?").get(uid)),
    ).toEqual(expect.objectContaining({ n: 0 }));
    expect(withDatabase((store) => store.visitorExists(uid))).toBe(false);
  });
});

test.describe("uploaded originals", () => {
  const READ_AT = "2026-09-16T09:15";

  test("an upload is stored, served locked down, and goes with Reset demo data", async ({ page, context }) => {
    await page.route("**/api/extract", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { customerName: "Uploaded Sheet Co" }, readAt: READ_AT }),
      }),
    );
    await page.goto("/work-orders/from-document");
    const bytes = Buffer.from("%PDF-1.4\n% the storage spec's job sheet\n");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Add from your document" }).click();
    await (await chooser).setFiles({ name: "sheet.pdf", mimeType: "application/pdf", buffer: bytes });
    await expect(formHeading(page)).toHaveText(/^Edit /);

    await page.reload();
    const link = page.locator('[data-name="sourceDocument"] a');
    const href = (await link.getAttribute("href"))!;
    expect(href).toMatch(/^\/api\/storage\/documents\/[0-9a-f-]{36}$/);
    const served = await page.request.get(href);
    expect(Buffer.from(await served.body()).equals(bytes)).toBe(true);
    expect(served.headers()["content-type"]).toBe("application/pdf");
    expect(served.headers()["content-security-policy"]).toBe("sandbox");
    expect(served.headers()["x-content-type-options"]).toBe("nosniff");

    // HTML that calls itself a PNG is not stored.
    const uid = (await visitorOf(context))!;
    const count = () =>
      (withDatabase((store) => store.db.prepare("SELECT COUNT(*) AS n FROM documents WHERE uid = ?").get(uid)) as { n: number }).n;
    expect(count()).toBe(1);
    const html = await page.request.post("/api/storage/documents", {
      multipart: {
        collection: "workOrders",
        file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("<html><script>alert(1)</script></html>") },
      },
    });
    expect(html.status()).toBe(415);
    expect(count()).toBe(1);

    await page.getByRole("button", { name: "Reset demo data" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset demo data" }).click();
    await expect.poll(async () => visitorOf(context)).not.toBe(uid);
    expect(count()).toBe(0);
    expect((await page.request.get(href)).status()).toBe(404);
  });
});

test.describe("a browser that blocks cookies", () => {
  test("gets the seed, the banner and no write controls, and leaves no row", async ({ browser, playwright, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    // The two routes that set the cookie answer through a request context of
    // their own, whose jar is thrown away, and lose `Set-Cookie` on the way back:
    // what a browser that blocks cookies sees. (`route.fetch()` would keep the
    // cookie in this context's jar, which is exactly what is being denied.)
    const issued: string[] = [];
    for (const path of ["**/api/storage/session", "**/api/storage/reset"]) {
      await context.route(path, async (route) => {
        const isolated = await playwright.request.newContext();
        const response = await isolated.fetch(route.request());
        const headers = { ...response.headers() };
        const cookie = /demo_uid=([^;]+)/.exec(headers["set-cookie"] ?? "")?.[1];
        if (cookie) issued.push(cookie);
        delete headers["set-cookie"];
        await route.fulfill({ status: response.status(), headers, body: await response.body() });
        await isolated.dispose();
      });
    }
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    const banner = page.getByRole("status").filter({ hasText: READ_ONLY_MESSAGE });

    const { title } = await firstLead();
    await page.goto("/leads");
    await expect(banner).toBeVisible();
    await expect(formHeading(page)).toHaveText(`View ${title}`);
    for (const name of ["Edit", "Delete", "Reset demo data"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
    }
    await expect(page.getByRole("button", { name: "New lead" }).first()).toBeDisabled();

    await page.goto("/work-orders");
    await expect(banner).toBeVisible();
    await expect(page.getByRole("button", { name: "Add from document", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "New work order" }).first()).toBeDisabled();

    await page.goto("/definition?form=checkout");
    await expect(banner).toBeVisible();
    await expect(page.getByRole("button", { name: "Save and quit" })).toBeDisabled();

    const write = await context.request.put(`/api/storage/results/leads/${leads.seed[0].id}`, {
      data: { data: { accountName: "Written without a cookie" } },
    });
    expect(write.status()).toBe(403);
    expect((await write.json()).error).toBe(READ_ONLY_MESSAGE);

    expect(issued.length).toBeGreaterThan(0);
    expect(withDatabase((store) => issued.filter((uid) => store.visitorExists(uid)))).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  });

  test("with cookies allowed there is no banner, and reading pages writes nothing", async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith("/api/storage/") && request.method() !== "GET" && url.pathname !== "/api/storage/session") {
        writes.push(`${request.method()} ${url.pathname}`);
      }
    });
    for (const path of ["/leads", "/work-orders", "/starter"]) {
      const handshake = page.waitForResponse("**/api/storage/session");
      await page.goto(path);
      await handshake;
      await expect(page.getByText(READ_ONLY_MESSAGE)).toHaveCount(0);
    }
    expect(writes).toEqual([]);
  });
});

test.describe("failures the page survives", () => {
  /**
   * A short definition for this visitor, so `/starter` completes quickly. It is
   * a real checkout rather than one question: the route runs the form's own suite
   * before it stores a definition, so a spec's fixture has to be valid for the
   * form it claims to be. See `e2e/short-checkout.ts`.
   */
  async function shortCheckout(page: Page) {
    await startSession(page.request);
    const stored = await page.request.put("/api/storage/definitions/checkout", {
      data: { json: SHORT_CHECKOUT },
    });
    expect(stored.status()).toBe(204);
  }

  /** Page through the short checkout to the last page, where Complete lives. */
  async function toTheLastPage(page: Page) {
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.locator('[data-name="note"] input')).toBeVisible();
  }

  test("a completed /starter is stored under its schema id", async ({ page, context }) => {
    await shortCheckout(page);
    await page.goto("/starter");
    const submitted = page.waitForResponse("**/api/storage/submissions/checkout");
    await toTheLastPage(page);
    await page.locator('[data-name="note"] input').fill("From the storage spec");
    await page.getByRole("button", { name: "Complete" }).click();
    expect((await submitted).status()).toBe(201);
    await expect(page.getByText("Thank you. Your response has been submitted.")).toBeVisible();

    const uid = (await visitorOf(context))!;
    const rows = withDatabase((store) => store.listRecords(uid, "checkout"));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toMatch(UUID);
    // The defaults of the two conditional blocks travel with the answer, as they
    // would from any checkout: the note is what this spec put there.
    expect(rows[0].data).toMatchObject({ note: "From the storage spec" });
  });

  test("a failed submission still thanks the visitor, and logs why", async ({ page }) => {
    await shortCheckout(page);
    await page.route("**/api/storage/submissions/checkout", (route) => route.abort());
    const logged = page.waitForEvent(
      "console",
      (message) => message.type() === "error" && message.text().includes("was not submitted"),
    );
    await page.goto("/starter");
    await toTheLastPage(page);
    await page.getByRole("button", { name: "Complete" }).click();
    await expect(page.getByText("Thank you. Your response has been submitted.")).toBeVisible();
    expect((await logged).text()).toContain("[survey-results] checkout was not submitted");
  });

  test("a row that fails to open leaves the open record on screen, with the reason", async ({ page }) => {
    const rows = await listResults("leads");
    const [first, second] = rows.map((row) => ({ id: row.id, title: recordTitle(leads, row) }));
    await page.route(`**/api/storage/results/leads/${second.id}`, (route) => route.abort());
    await page.goto("/leads");
    await rail(page, leadsNav.label).getByRole("link", { name: new RegExp(second.title) }).click();

    await expect(storageAlert(page)).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Loading" })).toHaveCount(0);
    await expect(formHeading(page)).toHaveText(`View ${first.title}`);
    await expect(page).toHaveURL(new RegExp(`${leadsNav.path}/${first.id}$`));
  });
});

test.describe("the accepted race", () => {
  /**
   * Decision A's known cost, documented rather than denied. Two tabs opened on a
   * first visit are each issued an id by their own handshake. When one tab saves
   * under its id and the other tab's handshake answer then replaces the cookie,
   * the save belongs to an id this browser no longer presents: after a reload it
   * is gone from the page, and the row waits for the GC.
   */
  test("a save under an id the other tab's handshake replaced is orphaned", async ({ page, context, baseURL }) => {
    await startSession(page.request);
    const losing = (await visitorOf(context))!;
    const lead = leads.seed[0];
    const saved = await page.request.put(`/api/storage/results/leads/${lead.id}`, {
      data: { data: { ...lead.data, accountName: "Saved under the losing id" } },
    });
    expect(saved.status()).toBe(200);

    // The other tab's handshake answer lands last.
    const winning = randomUUID();
    await context.addCookies([{ name: "demo_uid", value: winning, url: baseURL! }]);

    await page.goto("/leads");
    await expect(page.getByText("Saved under the losing id")).toHaveCount(0);
    expect(withDatabase((store) => [store.visitorExists(losing), store.visitorExists(winning)])).toEqual([true, false]);
  });
});
