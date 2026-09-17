import { test, expect } from "@playwright/test";
import { checkoutJson } from "../src/schemas/checkout";
import { leadsJson } from "../src/schemas/leads";
import { getVariablePresets } from "../src/schemas/variables";
import { FORMS } from "../src/components/configure/forms";
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

test("a personalized definition is clean once its variable presets come with it", async ({
  request,
}) => {
  const bare = await request.post("/api/lint", { data: { json: leadsJson } });
  const bareBody = (await bare.json()) as { ok: boolean; findings: Finding[] };
  expect(bareBody.ok).toBe(false);
  expect(bareBody.findings).toContainEqual(
    expect.objectContaining({
      ruleId: "reference/unknown",
      message: expect.stringContaining("user_role"),
    }),
  );

  const response = await request.post("/api/lint", {
    data: { json: leadsJson, variablePresets: getVariablePresets("leads") },
  });
  expect(await response.json()).toEqual({ ok: true, findings: [] });
});

test("a misspelled variable is reported with the declared one suggested", async ({ request }) => {
  const json = { elements: [{ type: "text", name: "q1", visibleIf: "{user_rol} = 'manager'" }] };
  const response = await request.post("/api/lint", {
    data: { json, variablePresets: getVariablePresets("leads") },
  });
  const body = (await response.json()) as { ok: boolean; findings: (Finding & { suggestion?: string })[] };
  expect(body.ok).toBe(false);
  expect(body.findings).toContainEqual(
    expect.objectContaining({ ruleId: "reference/unknown", suggestion: "user_role" }),
  );
});

test("a preset value its definition rejects is reported as variable/preset", async ({ request }) => {
  const presets = structuredClone(getVariablePresets("leads")!);
  presets.presets![1].variables.user_role = "intern";
  const response = await request.post("/api/lint", {
    data: { json: leadsJson, variablePresets: presets },
  });
  const body = (await response.json()) as { ok: boolean; findings: Finding[] };
  expect(body.ok).toBe(false);
  expect(body.findings).toEqual([
    expect.objectContaining({
      ruleId: "variable/preset",
      path: "variablePresets.presets[1].variables.user_role",
    }),
  ]);
});

/**
 * Every form the editor opens, with its presets. This spec runs in both editions, and
 * it is the only proof the full edition has that every configurable form is clean:
 * `configure.spec.ts`, which holds the per-form loop over the status bar, skips itself
 * outside the MIT edition, and Survey Creator has no lint UI to assert on yet.
 */
for (const form of FORMS) {
  test(`the shipped ${form.id} definition is clean at the API`, async ({ request }) => {
    const response = await request.post("/api/lint", {
      data: { json: form.json, variablePresets: getVariablePresets(form.id) },
    });
    expect(await response.json()).toEqual({ ok: true, findings: [] });
  });
}

test("a body that is not a definition object is refused", async ({ request }) => {
  for (const data of [[1, 2], { json: "not an object" }, {}]) {
    const response = await request.post("/api/lint", { data });
    expect(response.status()).toBe(400);
  }
});
