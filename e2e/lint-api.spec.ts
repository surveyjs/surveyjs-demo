import { test, expect } from "@playwright/test";
import { checkoutJson } from "../src/schemas/checkout";
import { lintMutations } from "../src/lib/lint/try-breaking-it";

/**
 * `/api/lint` is shared code, so this runs in both editions — unlike `lint.spec.ts`,
 * which drives the MIT edition's Monaco front end. The mutation below is the one the
 * "Try breaking it" button applies in the editor: what the editor flags, the server
 * rejects.
 */

type Finding = { ruleId: string; message: string; path: string; elementName?: string };

test("a shipped definition passes the server-side lint", async ({ request }) => {
  const response = await request.post("/api/lint", { data: { json: checkoutJson } });

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true, findings: [] });
});

test("a definition broken by a demo mutation is rejected, naming the element", async ({
  request,
}) => {
  const breakExpression = lintMutations.find((mutation) => mutation.id === "break-expression")!;
  const broken = breakExpression.apply(checkoutJson as Record<string, unknown>)!;
  expect(broken).not.toBeNull();

  const response = await request.post("/api/lint", { data: { json: broken } });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { ok: boolean; findings: Finding[] };

  expect(body.ok).toBe(false);
  expect(body.findings.length).toBeGreaterThan(0);
  // The mutation points the first `visibleIf` in the form at a question that does not exist.
  expect(body.findings).toContainEqual(
    expect.objectContaining({
      elementName: "billingAddress",
      path: expect.stringMatching(/\.visibleIf$/),
      message: expect.stringContaining("noSuchQuestion"),
    }),
  );
});

test("a body that is not a definition object is refused", async ({ request }) => {
  for (const data of [[1, 2], { json: "not an object" }, {}]) {
    const response = await request.post("/api/lint", { data });
    expect(response.status()).toBe(400);
  }
});
