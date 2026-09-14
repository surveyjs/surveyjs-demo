import type { SurveyJSON } from "@/schemas";

/**
 * One of the two seams between this template and your storage: the survey
 * definitions edited on the `/configure` pages. Its sibling,
 * `survey-results.ts`, covers the answers people submit.
 *
 * Nothing else in the app reads or writes a survey definition — replace the
 * three bodies below with calls to your API and the rest of the template is
 * untouched:
 *
 *   export async function loadSurveyJson(schemaId: string) {
 *     const res = await fetch(`/api/schemas/${schemaId}`, { cache: "no-store" });
 *     if (res.status === 404) return null;
 *     if (!res.ok) throw new Error(`GET /api/schemas/${schemaId}: ${res.status}`);
 *     return res.json();
 *   }
 *
 * The signatures are async already, so swapping the implementation does not
 * change a single call site.
 *
 * A real `saveSurveyJson` lints before it stores. `/api/lint` runs the same
 * `survey-core/linter` rules the editor shows while somebody types, so a
 * definition the editor flagged is refused here too — including one that never
 * went through the editor:
 *
 *   export async function saveSurveyJson(schemaId: string, json: SurveyJSON) {
 *     const lint = await fetch("/api/lint", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({ json }),
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
 * place a rule is enforced, only the place it is first shown.
 *
 * This demo keeps each visitor's edits in their own browser, in localStorage.
 * The server always renders the definition that ships with the template, so the
 * prerendered HTML — the one crawlers get — stays canonical, and one visitor's
 * experiment never leaks into anyone else's page.
 */

const PREFIX = "sjs-demo-schema:";

function key(schemaId: string): string {
  return `${PREFIX}${schemaId}`;
}

/** The stored definition for `schemaId`, or null when there is none. */
export async function loadSurveyJson(
  schemaId: string,
): Promise<SurveyJSON | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(schemaId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as SurveyJSON;
  } catch {
    return null;
  }
}

/** Store a definition. Throws when storage refuses it, so callers can report it. */
export async function saveSurveyJson(
  schemaId: string,
  json: SurveyJSON,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("A survey definition can only be saved in the browser.");
  }
  try {
    window.localStorage.setItem(key(schemaId), JSON.stringify(json));
  } catch {
    throw new Error(
      "Could not write to localStorage — private browsing or storage is full.",
    );
  }
}

/** Drop the stored definition, so the one shipped with the template applies again. */
export async function resetSurveyJson(schemaId: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(schemaId));
  } catch {
    // Ignore — a demo override is not worth surfacing a storage failure for.
  }
}
