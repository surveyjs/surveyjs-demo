import { insuranceClaimSeed, type SurveyData, type SurveyResult } from "@/schemas";

/**
 * One of the two seams between this template and your storage: the answers
 * people submit. Its sibling, `survey-json.ts`, covers the survey definitions.
 *
 * Nothing else in the app reads or writes a survey result — replace the four
 * bodies below with calls to your API and the rest of the template is untouched:
 *
 *   export async function listResults(): Promise<SurveyResult[]> {
 *     const res = await fetch("/api/claims", { cache: "no-store" });
 *     if (!res.ok) throw new Error(`GET /api/claims: ${res.status}`);
 *     return res.json();
 *   }
 *
 * The signatures are async already, so swapping the implementation does not
 * change a single call site.
 *
 * Where each one runs: `listResults` is called by the `/claims` server
 * component, so the table and the form are in the HTML the server sends; the
 * three mutations are called from the client, the way they would hit your API.
 * Point them all at the same database and that split is what a real app does.
 *
 * Nothing here persists, on purpose — a template should not look like it stores
 * someone's data when it does not. The seed array below is the whole store, so
 * an edit lives in the page's React state and is gone as soon as you navigate
 * away or reload.
 */

let records: SurveyResult[] = insuranceClaimSeed.map((record) => ({
  ...record,
  data: { ...record.data },
}));

/** All stored records, newest last. Backs the `/claims` table. */
export async function listResults(): Promise<SurveyResult[]> {
  return records.map((record) => ({ ...record, data: { ...record.data } }));
}

/** Create or update one record. Returns what was stored. */
export async function saveResult(
  id: string,
  data: SurveyData,
): Promise<SurveyResult> {
  const saved: SurveyResult = { id, data: { ...data } };
  const index = records.findIndex((record) => record.id === id);
  records = index === -1
    ? [...records, saved]
    : records.map((record, i) => (i === index ? saved : record));
  return { id, data: { ...data } };
}

/** Delete one record. Deleting an unknown id is not an error. */
export async function deleteResult(id: string): Promise<void> {
  records = records.filter((record) => record.id !== id);
}

/**
 * A visitor completed a form that is not part of the records CRUD — `/starter`.
 * This is where a real app POSTs the submission.
 *
 * `schemaId` says which form it came from; `data` is keyed by question name and
 * already excludes answers hidden by `visibleIf` (see `clearInvisibleValues` in
 * the schemas).
 */
export async function submitResult(
  schemaId: string,
  data: SurveyData,
): Promise<void> {
  console.info(`[survey-results] ${schemaId} submitted`, data);
}
