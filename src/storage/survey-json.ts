import type { SurveyJSON } from "@/schemas";
import { beforeWrite, storageError } from "./access";

/**
 * One of the seams between this template and your storage: the survey
 * definitions edited on the `/configure` pages. Its siblings are
 * `survey-results.ts`, the answers people submit, `documents.ts`, the originals
 * records are read from, and `session.ts`, the signed-in user.
 *
 * Nothing else in the app reads or writes a survey definition. Here the three
 * bodies below talk to this demo's own storage: on the server they call the
 * backend, `backend/sqlite.ts`, directly, for the visitor the request's cookie
 * names; in the browser they call `/api/storage/definitions`. Point them at your
 * API instead and the rest of the template is untouched:
 *
 *   export async function loadSurveyJson(schemaId: string) {
 *     const res = await fetch(`/api/schemas/${schemaId}`, { cache: "no-store" });
 *     if (res.status === 404) return null;
 *     if (!res.ok) throw new Error(`GET /api/schemas/${schemaId}: ${res.status}`);
 *     return res.json();
 *   }
 *
 * A real `saveSurveyJson` lints before it stores. `/api/lint` runs the same
 * `survey-core/linter` rules the editor shows while somebody types, so a
 * definition the editor flagged is refused here too — including one that never
 * went through the editor. The form's variable presets go with it, so a
 * personalized definition's `{user_…}` references are known there as they are in
 * the editor:
 *
 *   export async function saveSurveyJson(schemaId: string, json: SurveyJSON) {
 *     const lint = await fetch("/api/lint", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({ json, variablePresets: getVariablePresets(schemaId) }),
 *     }).then((res) => res.json());
 *     if (!lint.ok) {
 *       throw new Error(`Not saved: ${lint.findings.length} static analysis finding(s).`);
 *     }
 *     const res = await fetch(`/api/schemas/${schemaId}`, {
 *       method: "PUT",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify(json),
 *     });
 *     if (!res.ok) throw new Error(`PUT /api/schemas/${schemaId}: ${res.status}`);
 *   }
 *
 * Your own `PUT /api/schemas/:id` handler should call `lintSurveyJson` from
 * `src/lib/lint/lint-survey.ts` again before it writes: the browser is not the
 * place a rule is enforced, only the place it is first shown. This demo's route
 * does not lint: Survey Creator autosaves in the full edition, a half-typed
 * expression would fail every one of those saves, and the sandbox is the
 * visitor's own.
 *
 * Every visitor has their own copy of every definition, and the pages render
 * it on the server, so a reload shows the edit with no loading state. A visitor
 * who has stored nothing, a crawler among them, gets the definitions that ship.
 */

const route = (schemaId: string) => `/api/storage/definitions/${encodeURIComponent(schemaId)}`;

/** The visitor's definition for `schemaId`: their own copy, or the one that ships. */
export async function loadSurveyJson(schemaId: string): Promise<SurveyJSON | null> {
  if (typeof window === "undefined") {
    const { readAsVisitor } = await import("./backend/visitor");
    return (await readAsVisitor((store, uid) => store.getDefinition(uid, schemaId))) ?? null;
  }
  const res = await fetch(route(schemaId), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw await storageError(res, `GET ${route(schemaId)}`);
  return ((await res.json()) as { json: SurveyJSON }).json;
}

/** Store a definition. Throws when storage refuses it, so callers can report it. */
export async function saveSurveyJson(schemaId: string, json: SurveyJSON): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("A survey definition can only be saved in the browser.");
  }
  await beforeWrite();
  const res = await fetch(route(schemaId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json }),
  });
  if (!res.ok) throw await storageError(res, `PUT ${route(schemaId)}`);
}

/** Put back the definition that ships, for this one form. */
export async function resetSurveyJson(schemaId: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("A survey definition can only be reset in the browser.");
  }
  await beforeWrite();
  const res = await fetch(route(schemaId), { method: "DELETE" });
  if (!res.ok) throw await storageError(res, `DELETE ${route(schemaId)}`);
}
