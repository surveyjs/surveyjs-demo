import {
  getRecordCollection,
  sortRows,
  type RecordRow,
  type StoredRecord,
  type SurveyData,
} from "@/schemas";

/**
 * One of the three seams between this template and your storage: the answers
 * people submit. Its siblings are `survey-json.ts`, the survey definitions, and
 * `session.ts`, the signed-in user.
 *
 * Nothing else in the app reads or writes a survey result — replace the bodies
 * below with calls to your API and the rest of the template is untouched. A
 * record is stored twice over, the way a system of record keeps it: the whole
 * response as a document, and the few columns a list needs, derived from it on
 * every write. So there are two reads, and neither returns the other's half:
 *
 *   export async function listResults(collectionId: string) {
 *     const res = await fetch(`/api/${collectionId}`, { cache: "no-store" });
 *     if (!res.ok) throw new Error(`GET /api/${collectionId}: ${res.status}`);
 *     return res.json(); // [{ id, columns }] — no documents
 *   }
 *
 *   export async function getResult(collectionId: string, id: string) {
 *     const res = await fetch(`/api/${collectionId}/${id}`, { cache: "no-store" });
 *     if (res.status === 404) return undefined;
 *     return res.json(); // { id, columns, data } — the whole response
 *   }
 *
 * The signatures are async already, so swapping the implementation does not
 * change a single call site.
 *
 * Where each one runs: `listResults`, and `getResult` for the first row, are
 * called by the records pages' server components, so the table and the form are
 * in the HTML the server sends; opening another row calls `getResult` from the
 * client, and so do the mutations, the way they would hit your API. Point them
 * all at the same database and that split is what a real app does.
 *
 * Nothing here persists, on purpose — a template should not look like it stores
 * someone's data when it does not. Each collection's seed is the whole store, so
 * an edit lives in the page's React state and is gone as soon as you navigate
 * away or reload. The server and the browser each hold their own copy of this
 * module.
 */

const stores = new Map<string, StoredRecord[]>();

/** A collection's records, created from its seed the first time it is asked for. */
function store(collectionId: string): StoredRecord[] {
  let records = stores.get(collectionId);
  if (!records) {
    const collection = getRecordCollection(collectionId);
    records = collection.seed.map(({ id, data }) => ({
      id,
      columns: collection.toColumns(id, data),
      data: structuredClone(data),
    }));
    stores.set(collectionId, records);
  }
  return records;
}

function copy(record: StoredRecord): StoredRecord {
  return { id: record.id, columns: { ...record.columns }, data: structuredClone(record.data) };
}

/** The list query: columns only, in the collection's order. */
export async function listResults(collectionId: string): Promise<RecordRow[]> {
  const rows = store(collectionId).map(({ id, columns }) => ({ id, columns: { ...columns } }));
  return sortRows(getRecordCollection(collectionId), rows);
}

/** One record's whole response. `undefined` for an unknown id. */
export async function getResult(
  collectionId: string,
  id: string,
): Promise<StoredRecord | undefined> {
  const record = store(collectionId).find((item) => item.id === id);
  return record && copy(record);
}

/** Create or update. Derives the columns from `data`, stores both, returns what was stored. */
export async function saveResult(
  collectionId: string,
  id: string,
  data: SurveyData,
): Promise<StoredRecord> {
  const collection = getRecordCollection(collectionId);
  const saved: StoredRecord = {
    id,
    columns: collection.toColumns(id, data),
    data: structuredClone(data),
  };
  const records = store(collectionId);
  const index = records.findIndex((record) => record.id === id);
  stores.set(
    collectionId,
    index === -1 ? [...records, saved] : records.map((record, i) => (i === index ? saved : record)),
  );
  return copy(saved);
}

/** Delete one record. Deleting an unknown id is not an error. */
export async function deleteResult(collectionId: string, id: string): Promise<void> {
  stores.set(
    collectionId,
    store(collectionId).filter((record) => record.id !== id),
  );
}

/**
 * A visitor completed a form that is not part of a records page — `/starter`.
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
