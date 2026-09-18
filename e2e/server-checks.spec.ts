import { test, expect, type APIRequestContext } from "@playwright/test";
import { FunctionFactory } from "survey-core";
import { checkoutSample } from "../src/schemas/data/checkout-seed";
import { checkoutJson } from "../src/schemas/checkout";
import { workOrderJson } from "../src/schemas/work-order";
import { assignRowIds, getRecordCollection, recordCollections } from "../src/schemas/records";
import { getSchemaDefinition, schemaRegistry } from "../src/schemas";
import { getSurveyTests } from "../src/schemas/tests";
import { LEADS_USERS } from "../src/schemas/variables/leads";
import { toVariables } from "../src/schemas/variables/prefix";
import { checkResponse, sanitizeResponse } from "../src/lib/checks/check-response";
import { checkDefinition } from "../src/lib/checks/check-definition";
import { NOT_SAVED, NOT_STORED, refusalMessage } from "../src/lib/checks/messages";
import { takeFromDocument } from "../src/app/api/extract/take-from-document";
import { lintMutations } from "../src/lib/lint/try-breaking-it";
import { workOrderSampleDocuments } from "../src/components/extract/sample-documents";
import {
  MAX_VALUE_BYTES,
  openDatabase,
  SCHEMA_VERSION,
  type DemoStore,
} from "../src/storage/backend/sqlite";
import { startSession } from "./session";

/**
 * The server is where a rule is enforced.
 *
 * The template says so twice, and these tests are what makes it true: no write
 * route stores a response its definition rejects, or a definition that fails the
 * linter or its own suite, and every refusal is a 422 that names the first thing
 * wrong. They run in both editions, because the routes and the checks are shared
 * code and the claim is the application's, not one edition's.
 *
 * Half of them need no browser at all: the checks are `survey-core` and nothing
 * else, so a spec calls them directly. The other half go through the API with a
 * visitor's cookie and then read the database with SQL, because "nothing was
 * stored" is not a thing an HTTP response can be trusted to prove.
 */

const leads = getRecordCollection("leads");
const workOrders = getRecordCollection("workOrders");

function withDatabase<T>(read: (store: DemoStore) => T): T {
  const store = openDatabase(process.env.DATABASE_PATH!, SCHEMA_VERSION);
  try {
    return read(store);
  } finally {
    store.close();
  }
}

/** Every record this visitor has in a collection, straight out of SQL. */
function storedRecords(uid: string, collectionId: string): { record_id: string; json: string }[] {
  return withDatabase(
    (store) =>
      store.db
        .prepare("SELECT record_id, json FROM data_records WHERE uid = ? AND form_id = ?")
        .all(uid, collectionId) as { record_id: string; json: string }[],
  );
}

/** The visitor id a request context is carrying, or undefined before its first write. */
async function visitorOf(request: APIRequestContext): Promise<string | undefined> {
  const { cookies } = await request.storageState();
  return cookies.find((cookie) => cookie.name === "demo_uid")?.value;
}

function hasVisitorRow(uid: string): boolean {
  const row = withDatabase(
    (store) => store.db.prepare("SELECT COUNT(*) AS n FROM visitors WHERE uid = ?").get(uid),
  ) as { n: number };
  return row.n > 0;
}

// ---------------------------------------------------------------------------
// Without a browser: the data this template ships
// ---------------------------------------------------------------------------

test.describe("the shipped data passes its own checks", () => {
  for (const schemaId of Object.keys(schemaRegistry)) {
    test(`${schemaId}: the shipped definition lints and passes its tests`, async () => {
      const verdict = await checkDefinition(schemaId, getSchemaDefinition(schemaId).json);
      expect(verdict, JSON.stringify(verdict.first ?? null)).toMatchObject({ ok: true });
    });
  }

  test("the checkout suite runs against the checkout definition", async () => {
    expect(getSurveyTests("checkout")).toBeDefined();
    const verdict = await checkDefinition("checkout", checkoutJson);
    expect(verdict.ok).toBe(true);
  });

  test("a form with no suite passes the test step", async () => {
    expect(getSurveyTests("work-order")).toBeUndefined();
    expect(await checkDefinition("work-order", workOrderJson)).toEqual({ ok: true, count: 0 });
  });

  /**
   * Every seed record, for every user a page can be rendered as. One of them is
   * deliberately not storable by everybody: `LEAD-0003` discounts above 20%, and
   * the lead form's own rule says that needs a manager. It passes for Ines and
   * fails for Owen, which is the whole point of the route using the session
   * user's variables rather than the client's word for them.
   */
  test("every seed record fits its definition, for the user who may store it", async () => {
    const verdicts: Record<string, boolean> = {};
    for (const collection of Object.values(recordCollections)) {
      const definition = getSchemaDefinition(collection.schemaId).json;
      const personas = collection.id === leads.id ? LEADS_USERS : [undefined];
      for (const user of personas) {
        for (const record of collection.seed) {
          const data = collection.rowIdContainers
            ? assignRowIds(record.data, collection.rowIdContainers)
            : record.data;
          const verdict = await checkResponse(definition, data, {
            variables: user ? toVariables(user) : undefined,
            requireComplete: !collection.isDraft?.(data),
          });
          verdicts[`${collection.id}/${record.id} as ${user?.name ?? "anyone"}`] = verdict.ok;
          // Shape is never in question for anything that ships.
          expect(verdict.first?.kind, `${record.id}: ${verdict.first?.message}`).not.toBe("shape");
        }
      }
    }
    const refused = Object.entries(verdicts)
      .filter(([, ok]) => !ok)
      .map(([label]) => label);
    expect(refused).toEqual([`${leads.id}/LEAD-0003 as ${LEADS_USERS[0].name}`]);
  });

  test("the lead only a manager may store names the rule and the cell", async () => {
    const definition = getSchemaDefinition(leads.schemaId).json;
    const record = leads.seed.find((row) => row.id === "LEAD-0003")!;
    const data = assignRowIds(record.data, leads.rowIdContainers!);
    const asRep = await checkResponse(definition, data, { variables: toVariables(LEADS_USERS[0]) });
    expect(asRep.ok).toBe(false);
    expect(asRep.first?.kind).toBe("validation");
    expect(asRep.first?.message).toContain("manager");
    expect(asRep.first?.name).toBe("lineItems");
    expect(
      (await checkResponse(definition, data, { variables: toVariables(LEADS_USERS[1]) })).ok,
    ).toBe(true);
  });

  /**
   * A record built exactly as `createFrom` builds it from a document. It is a
   * draft, so the route checks its shape and not its completeness — and the
   * shape has to be right for every sample, or the import flow would refuse
   * readings the panel has already shown to the visitor.
   */
  for (const sample of workOrderSampleDocuments) {
    test(`a draft built from ${sample.id} is storable`, async () => {
      const definition = getSchemaDefinition(workOrders.schemaId).json;
      const record = draftFromDocument(sample.file);
      const shape = sanitizeResponse(definition, record);
      expect(shape.rejections).toEqual([]);
      expect(await checkResponse(definition, record, { requireComplete: false })).toEqual({
        ok: true,
        count: 0,
      });
      // The collection calls it a draft, which is what makes the route skip
      // completeness for it.
      expect(workOrders.isDraft?.(record)).toBe(true);
    });
  }
});

/**
 * What a document reading looks like once `createFrom` has made a record of it:
 * the same precedence the page uses — the new record's defaults, then the
 * answers, then what the app pins.
 */
function draftFromDocument(fileUrl: string, answers: Record<string, unknown> = {}): Record<string, unknown> {
  const reading = {
    jobNumber: "WO-2026-0130",
    status: "completed",
    visitDate: "2026-09-14",
    customerName: "Ashgrove District Schools",
    siteAddress: "Ashgrove Middle School, boiler room",
    faultReported: "Boiler 2 locking out on flame failure.",
    laborHours: 2,
    laborRate: 120,
    parts: [{ partNumber: "IGN-399", description: "Hot surface igniter", quantity: 1, unitPrice: 68 }],
    ...answers,
  };
  const source = {
    name: fileUrl.split("/").pop()!,
    type: "application/pdf",
    url: fileUrl,
    readAt: "2026-09-15T10:42",
  };
  const existing = workOrders.seed.map((row) => row.id);
  const id = workOrders.fromDocument?.id?.(reading, existing) ?? workOrders.newId(existing);
  return {
    ...workOrders.newRecord(id, undefined),
    ...reading,
    ...workOrders.fromDocument!.pinned(id, source),
  };
}

// ---------------------------------------------------------------------------
// Without a browser: the sanitizer
// ---------------------------------------------------------------------------

test.describe("the shape check", () => {
  const definition = {
    elements: [
      { type: "text", name: "t" },
      {
        type: "matrixdynamic",
        name: "m",
        columns: [
          { name: "c", cellType: "dropdown", choices: ["a", "b"] },
          { name: "d", cellType: "text" },
        ],
      },
      { type: "dropdown", name: "pick", choices: ["x", "y"] },
    ],
  };

  /**
   * The three inputs survey-core itself does not refuse: an object and an array
   * in a text question survive `clearIncorrectValues` and pass `validate`, and a
   * string in a dynamic matrix does the same. They are the reason layer one
   * reads the payload rather than the model.
   */
  for (const [label, payload, path] of [
    ["an object in a text question", { t: { x: 1 } }, "t"],
    ["an array in a text question", { t: [1, 2] }, "t"],
    ["a string where a matrix expects rows", { m: "oops" }, "m"],
  ] as const) {
    test(`${label} is rejected at its own path`, () => {
      const { data, rejections } = sanitizeResponse(definition, payload);
      expect(rejections).toHaveLength(1);
      expect(rejections[0].path).toBe(path);
      expect(data).toEqual({});
    });
  }

  /**
   * On survey-core 3.1.0 this input makes `clearIncorrectValues` throw a
   * `TypeError`. Layer one refuses it before a model is ever built, so it is a
   * rejection and never a 500.
   */
  test("a dynamic matrix whose rows are not objects is refused, not thrown on", () => {
    const { rejections } = sanitizeResponse(definition, { m: ["x", 5] });
    expect(rejections).toHaveLength(1);
    expect(rejections[0].path).toBe("m");
  });

  test("one bad cell costs that cell, and the other rows are kept", () => {
    const payload = {
      m: [
        { c: "a", d: "keep" },
        { c: "b", d: "keep too" },
        { c: "not-a-choice", d: "keep as well" },
      ],
    };
    const before = JSON.stringify(payload);
    const { data, rejections } = sanitizeResponse(definition, payload);
    expect(rejections).toHaveLength(1);
    expect(rejections[0].path).toBe("m[2].c");
    expect(data).toEqual({
      m: [
        { c: "a", d: "keep" },
        { c: "b", d: "keep too" },
        { d: "keep as well" },
      ],
    });
    // The input is never mutated: the caller still holds what arrived.
    expect(JSON.stringify(payload)).toBe(before);
  });

  test("an unknown key and an off-list choice are each named", () => {
    const { rejections } = sanitizeResponse(definition, { nosuch: 1, pick: "zzz" });
    expect(rejections.map((rejection) => rejection.path)).toEqual(["nosuch", "pick"]);
  });

  test("every shipped question type is one the table knows", () => {
    // A type the table has not been taught refuses nothing, so a value that does
    // not fit would be stored. Nothing that ships may be in that state.
    for (const schemaId of Object.keys(schemaRegistry)) {
      const json = getSchemaDefinition(schemaId).json;
      const { rejections } = sanitizeResponse(json, {});
      expect(rejections).toEqual([]);
    }
  });
});

test.describe("validation that does not finish", () => {
  const withAsyncValidator = (fn: string) => ({
    elements: [
      {
        type: "text",
        name: "q",
        validators: [{ type: "expression", expression: `${fn}({q}) = true`, text: "the rule failed" }],
      },
    ],
  });

  test("an async validator that answers is awaited", async () => {
    FunctionFactory.Instance.register(
      "serverChecksAnswers",
      function (this: { returnResult: (value: unknown) => void }) {
        setTimeout(() => this.returnResult(true), 5);
      },
      true,
    );
    expect(await checkResponse(withAsyncValidator("serverChecksAnswers"), { q: "v" })).toEqual({
      ok: true,
      count: 0,
    });
  });

  /**
   * survey-core calls the callback only when the function answers, so a
   * validator that never does would hold the request open for ever. The deadline
   * is what makes "no verdict" mean "not stored".
   */
  test("an async validator that never answers ends as a refusal at the deadline", async () => {
    FunctionFactory.Instance.register("serverChecksNeverAnswers", function () {}, true);
    const started = Date.now();
    const verdict = await checkResponse(
      withAsyncValidator("serverChecksNeverAnswers"),
      { q: "v" },
      { timeoutMs: 300 },
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.first?.kind).toBe("validation");
    expect(verdict.first?.message).toContain("did not finish");
    expect(Date.now() - started).toBeLessThan(3000);
  });
});

// ---------------------------------------------------------------------------
// Records, through the API
// ---------------------------------------------------------------------------

test.describe("a record the definition rejects is not stored", () => {
  /** A lead the sales rep may store, as the seed has it. */
  const validLead = () => structuredClone(leads.seed[0].data) as Record<string, unknown>;

  async function put(
    request: APIRequestContext,
    data: unknown,
    id = "LEAD-0001",
    userId?: string,
  ) {
    return request.put(`/api/storage/results/${leads.id}/${id}`, {
      data: userId ? { data, userId } : { data },
    });
  }

  for (const [label, mutate, path] of [
    ["an unknown key", (data: Record<string, unknown>) => ({ ...data, nosuch: 1 }), "nosuch"],
    [
      "an off-list choice",
      (data: Record<string, unknown>) => ({ ...data, stage: "not-a-stage" }),
      "stage",
    ],
    [
      "a string where a matrix expects rows",
      (data: Record<string, unknown>) => ({ ...data, lineItems: "oops" }),
      "lineItems",
    ],
    [
      "rows that are not objects",
      (data: Record<string, unknown>) => ({ ...data, lineItems: ["x", 5] }),
      "lineItems",
    ],
    [
      "an object in a text question",
      (data: Record<string, unknown>) => ({ ...data, company: { name: "x" } }),
      "company",
    ],
  ] as const) {
    test(`${label} is a 422 that names the path, and nothing is stored`, async ({ request }) => {
      await startSession(request);
      const response = await put(request, mutate(validLead()));
      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body.check).toBe("response");
      expect(body.first.path).toBe(path);
      expect(body.error).toContain("Not stored:");
      const uid = await visitorOf(request);
      expect(uid).toBeTruthy();
      // The template's own rows are copied on a visitor's first write, so a
      // refusal that wrote nothing leaves them with no rows at all.
      expect(hasVisitorRow(uid!)).toBe(false);
    });
  }

  test("a missing required answer is a 422 naming the question", async ({ request }) => {
    await startSession(request);
    const data = validLead();
    delete data.accountName;
    const response = await put(request, data);
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.first.kind).toBe("validation");
    expect(body.first.name).toBe("accountName");
  });

  test("a lead is checked with the variables of the user who is saving it", async ({ request }) => {
    await startSession(request);
    const data = leads.seed.find((row) => row.id === "LEAD-0003")!.data;
    const [rep, manager] = LEADS_USERS;

    const refused = await put(request, data, "LEAD-0003", rep.id);
    expect(refused.status()).toBe(422);
    expect((await refused.json()).first.message).toContain("manager");

    const stored = await put(request, data, "LEAD-0003", manager.id);
    expect(stored.status()).toBe(200);
  });

  test("an unknown user id is a 400", async ({ request }) => {
    await startSession(request);
    const response = await put(request, validLead(), "LEAD-0001", "nobody");
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain("Unknown user");
  });

  test("a draft work order may be incomplete, and a malformed one may not", async ({ request }) => {
    await startSession(request);
    const draft = draftFromDocument("/samples/work-order-0130.pdf");
    delete draft.faultReported;
    const stored = await request.put(`/api/storage/results/${workOrders.id}/${draft.jobNumber}`, {
      data: { data: draft },
    });
    expect(stored.status()).toBe(200);

    const malformed: Record<string, unknown> = {
      ...draftFromDocument("/samples/work-order-0130.pdf"),
      parts: "oops",
    };
    const refused = await request.put(
      `/api/storage/results/${workOrders.id}/${malformed.jobNumber}`,
      { data: { data: malformed } },
    );
    expect(refused.status()).toBe(422);
    expect((await refused.json()).first.path).toBe("parts");
  });

  test("a record over the cap that is also malformed is a 413, not a 422", async ({ request }) => {
    await startSession(request);
    const data = { ...validLead(), nosuch: "x".repeat(MAX_VALUE_BYTES + 1) };
    const response = await put(request, data);
    expect(response.status()).toBe(413);
  });
});

// ---------------------------------------------------------------------------
// Submissions, through the API
// ---------------------------------------------------------------------------

test.describe("a submission the definition rejects is not stored", () => {
  const submit = (request: APIRequestContext, data: unknown) =>
    request.post("/api/storage/submissions/checkout", { data: { data } });

  test("a complete checkout is stored", async ({ request }) => {
    await startSession(request);
    const response = await submit(request, checkoutSample);
    expect(response.status()).toBe(201);
    expect((await response.json()).id).toBeTruthy();
  });

  for (const [label, data, path] of [
    ["an unknown key", { ...checkoutSample, nosuch: 1 }, "nosuch"],
    ["an off-list choice", { ...checkoutSample, shippingMethod: "teleport" }, "shippingMethod"],
    ["an object in a text question", { ...checkoutSample, email: { at: "x" } }, "email"],
  ] as const) {
    test(`${label} is a 422 and nothing is stored`, async ({ request }) => {
      await startSession(request);
      const response = await submit(request, data);
      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body.check).toBe("response");
      expect(body.first.path).toBe(path);
      const uid = await visitorOf(request);
      expect(storedRecords(uid!, "checkout")).toEqual([]);
    });
  }

  test("a missing required answer is a 422", async ({ request }) => {
    await startSession(request);
    const data = { ...checkoutSample };
    delete (data as Record<string, unknown>).acceptTerms;
    const response = await submit(request, data);
    expect(response.status()).toBe(422);
    expect((await response.json()).first.kind).toBe("validation");
  });
});

// ---------------------------------------------------------------------------
// The visitor's own definition decides
// ---------------------------------------------------------------------------

test("a submission is measured against the visitor's definition, not the shipped one", async ({
  request,
}) => {
  await startSession(request);
  const edited = structuredClone(checkoutJson) as Record<string, unknown>;
  const walk = (node: unknown, visit: (element: Record<string, unknown>) => void) => {
    if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
    if (!node || typeof node !== "object") return;
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((value) => walk(value, visit));
  };
  walk(edited, (element) => {
    // A new shipping choice, and one more answer the form insists on.
    if (element.name === "shippingMethod" && Array.isArray(element.choices)) {
      element.choices = [...element.choices, { value: "drone", text: "By drone" }];
    }
    if (element.name === "orderNotes") element.isRequired = true;
  });
  expect((await request.put("/api/storage/definitions/checkout", { data: { json: edited } })).status()).toBe(204);

  const withNewChoice = { ...checkoutSample, shippingMethod: "drone" };
  expect(
    (await request.post("/api/storage/submissions/checkout", { data: { data: withNewChoice } })).status(),
  ).toBe(201);

  const withoutNewlyRequired: Record<string, unknown> = { ...checkoutSample };
  delete withoutNewlyRequired.orderNotes;
  const refused = await request.post("/api/storage/submissions/checkout", {
    data: { data: withoutNewlyRequired },
  });
  expect(refused.status()).toBe(422);
  expect((await refused.json()).first.name).toBe("orderNotes");

  // Both would have gone the other way against the definition that ships: the
  // new choice is not on its list, and the note it does not insist on.
  expect((await checkResponse(checkoutJson, withNewChoice)).ok).toBe(false);
  expect((await checkResponse(checkoutJson, withoutNewlyRequired)).ok).toBe(true);
});

test("a record is measured against the visitor's definition too", async ({ request }) => {
  await startSession(request);
  const edited = structuredClone(workOrderJson) as Record<string, unknown>;
  const walk = (node: unknown, visit: (element: Record<string, unknown>) => void) => {
    if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
    if (!node || typeof node !== "object") return;
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((value) => walk(value, visit));
  };
  walk(edited, (element) => {
    if (element.name === "status" && Array.isArray(element.choices)) {
      element.choices = [...element.choices, { value: "disputed", text: "Disputed" }];
    }
  });
  expect(
    (await request.put("/api/storage/definitions/work-order", { data: { json: edited } })).status(),
  ).toBe(204);

  const record = { ...structuredClone(workOrders.seed[0].data), status: "disputed" };
  const stored = await request.put(`/api/storage/results/${workOrders.id}/${workOrders.seed[0].id}`, {
    data: { data: record },
  });
  expect(stored.status()).toBe(200);
  // Against the shipped definition it is an off-list choice.
  expect((await sanitizeResponse(workOrderJson, record)).rejections[0]?.path).toBe("status");
});

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

test.describe("what a document reading is allowed to say", () => {
  /** The model's answer, with one value off the list and one bad matrix cell. */
  const reading = {
    jobNumber: "WO-2026-0140",
    customerName: "Ashgrove District Schools",
    equipmentType: "teleporter",
    parts: [
      { partNumber: "IGN-399", description: "Igniter", quantity: 1, unitPrice: 68 },
      { partNumber: "X", description: "Widget", quantity: { many: 2 }, unitPrice: 10 },
    ],
  };

  test("a value that does not fit is dropped and named, and the rest is kept", () => {
    const { data, rejected } = takeFromDocument(workOrderJson, reading);
    expect(rejected.map((entry) => entry.path)).toEqual(["equipmentType", "parts[1].quantity"]);
    expect(data.jobNumber).toBe("WO-2026-0140");
    expect(data.customerName).toBe("Ashgrove District Schools");
    expect(data).not.toHaveProperty("equipmentType");
    // Only the cell went: the row and the other row are still there.
    expect(data.parts).toEqual([
      { partNumber: "IGN-399", description: "Igniter", quantity: 1, unitPrice: 68 },
      { partNumber: "X", description: "Widget", unitPrice: 10 },
    ]);
  });

  test("what extraction returns is storable as a draft, by construction", async ({ request }) => {
    await startSession(request);
    const { data } = takeFromDocument(workOrderJson, reading);
    const record = { ...workOrders.newRecord("WO-2026-0140", undefined), ...data, status: "draft" };
    const response = await request.put(`/api/storage/results/${workOrders.id}/WO-2026-0140`, {
      data: { data: record },
    });
    expect(response.status()).toBe(200);
  });

  test("against an edited definition, a value legal only there is kept", () => {
    const edited = structuredClone(workOrderJson) as Record<string, unknown>;
    const walk = (node: unknown, visit: (element: Record<string, unknown>) => void) => {
      if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
      if (!node || typeof node !== "object") return;
      visit(node as Record<string, unknown>);
      Object.values(node).forEach((value) => walk(value, visit));
    };
    walk(edited, (element) => {
      if (element.name === "equipmentType" && Array.isArray(element.choices)) {
        element.choices = [...element.choices, { value: "teleporter", text: "Teleporter" }];
      }
    });
    const { data, rejected } = takeFromDocument(edited, reading);
    expect(data.equipmentType).toBe("teleporter");
    expect(rejected.map((entry) => entry.path)).toEqual(["parts[1].quantity"]);
  });
});

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

test.describe("a definition that fails is not stored", () => {
  for (const mutation of lintMutations) {
    test(`"${mutation.label}" is a 422 with check: lint`, async ({ request }) => {
      await startSession(request);
      const broken = mutation.apply(structuredClone(checkoutJson) as Record<string, unknown>);
      test.skip(!broken, "this mutation has no site in the checkout definition");
      const response = await request.put("/api/storage/definitions/checkout", {
        data: { json: broken },
      });
      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body.check).toBe("lint");
      expect(body.error).toContain("Not saved:");
      // The definition on the server is still the previous one.
      const { json } = await (await request.get("/api/storage/definitions/checkout")).json();
      expect(json).toEqual(checkoutJson);
    });
  }

  test("a definition that lints clean and fails its suite is a 422 with check: tests", async ({
    request,
  }) => {
    await startSession(request);
    // The card panel is what two of the four checkout tests are about. Making it
    // depend on something that never happens breaks the behaviour without
    // breaking a single rule the linter knows.
    const broken = structuredClone(checkoutJson) as Record<string, unknown>;
    const walk = (node: unknown, visit: (element: Record<string, unknown>) => void) => {
      if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
      if (!node || typeof node !== "object") return;
      visit(node as Record<string, unknown>);
      Object.values(node).forEach((value) => walk(value, visit));
    };
    walk(broken, (element) => {
      if (element.name === "cardPanel") element.visibleIf = "{paymentMethod} = 'neither'";
    });
    // It really does lint clean: this is the tests speaking, not the linter.
    expect((await checkDefinition("work-order", broken)).ok).toBe(true);

    const response = await request.put("/api/storage/definitions/checkout", {
      data: { json: broken },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.check).toBe("tests");
    expect(body.error).toContain("Card details show for a card");
    const { json } = await (await request.get("/api/storage/definitions/checkout")).json();
    expect(json).toEqual(checkoutJson);
  });

  test("a definition over the cap that would also fail the linter is a 413", async ({ request }) => {
    await startSession(request);
    const broken = lintMutations.find((mutation) =>
      mutation.apply(structuredClone(checkoutJson) as Record<string, unknown>),
    )!.apply(structuredClone(checkoutJson) as Record<string, unknown>)!;
    broken.description = "x".repeat(MAX_VALUE_BYTES + 1);
    const response = await request.put("/api/storage/definitions/checkout", {
      data: { json: broken },
    });
    expect(response.status()).toBe(413);
  });

  test("a refused definition creates no visitor row", async ({ request }) => {
    await startSession(request);
    const broken = { pages: [{ name: "p", elements: [{ type: "text", name: "a", visibleIf: "{" }] }] };
    const response = await request.put("/api/storage/definitions/checkout", {
      data: { json: broken },
    });
    expect(response.status()).toBe(422);
    const uid = await visitorOf(request);
    expect(hasVisitorRow(uid!)).toBe(false);
  });

  test("Reset is not checked: it restores a definition that ships", async ({ request }) => {
    await startSession(request);
    expect((await request.delete("/api/storage/definitions/plan-finder")).status()).toBe(204);
    const { json } = await (await request.get("/api/storage/definitions/plan-finder")).json();
    expect((await checkDefinition("plan-finder", json)).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// One sentence, everywhere
// ---------------------------------------------------------------------------

test("the API's sentence is the one `messages.ts` builds", async ({ request }) => {
  await startSession(request);
  const verdict = await checkDefinition("checkout", {
    pages: [{ name: "p", elements: [{ type: "text", name: "a", visibleIf: "{" }] }],
  });
  expect(verdict.ok).toBe(false);
  const expected = refusalMessage(NOT_SAVED, verdict.first!, verdict.count);
  const response = await request.put("/api/storage/definitions/checkout", {
    data: { json: { pages: [{ name: "p", elements: [{ type: "text", name: "a", visibleIf: "{" }] }] } },
  });
  expect((await response.json()).error).toBe(expected);

  const refusal = await request.post("/api/storage/submissions/checkout", {
    data: { data: { nosuch: 1 } },
  });
  const body = await refusal.json();
  expect(body.error.startsWith(`${NOT_STORED}:`)).toBe(true);
});
