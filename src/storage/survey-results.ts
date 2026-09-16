import {
  getRecordCollection,
  sortRows,
  type RecordCollection,
  type RecordRow,
  type StoredRecord,
  type SurveyData,
} from "@/schemas";
import { beforeWrite, storageError } from "./access";

/**
 * One of the seams between this template and your storage: the answers people
 * submit. Its siblings are `survey-json.ts`, the survey definitions,
 * `documents.ts`, the originals records are read from, and `session.ts`, the
 * signed-in user.
 *
 * Nothing else in the app reads or writes a survey result. A record is stored
 * the way a system of record keeps it: the whole response as a document, and
 * the few columns a list needs, derived from it. So there are two reads, and
 * neither returns the other's half. Against your API:
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
 * Where each one runs: `listResults`, and `getResult` for the first row, are
 * called by the records pages' server components, so the list and the form are
 * in the HTML the server sends; opening another row calls `getResult` from the
 * client, and so do the mutations. That split is what a real app does.
 *
 * Here the store is this demo's own: on the server these call the backend,
 * `backend/sqlite.ts`, directly, for the visitor the request's cookie names;
 * in the browser they call `/api/storage/results`. Each visitor has their own
 * copy of every collection, made from the seed on their first write, and it
 * persists across reloads until they reset it or it expires. The backend stores
 * the documents only; the columns are derived here, with the collection's
 * `toColumns`, on every read. The server never writes: a record is saved from
 * the browser, the way it reaches your API.
 */

const resultsRoute = (collectionId: string, id?: string) =>
  `/api/storage/results/${encodeURIComponent(collectionId)}${id === undefined ? "" : `/${encodeURIComponent(id)}`}`;

/** A stored document, with the columns the list reads derived from it. */
function withColumns(collection: RecordCollection, { id, data }: { id: string; data: SurveyData }): StoredRecord {
  return { id, columns: collection.toColumns(id, data), data };
}

/** The list query: columns only, in the collection's order. */
export async function listResults(collectionId: string): Promise<RecordRow[]> {
  const collection = getRecordCollection(collectionId);
  let records: { id: string; data: SurveyData }[];
  if (typeof window === "undefined") {
    const { readAsVisitor } = await import("./backend/visitor");
    records = await readAsVisitor((store, uid) => store.listRecords(uid, collectionId));
  } else {
    const res = await fetch(resultsRoute(collectionId), { cache: "no-store" });
    if (!res.ok) throw await storageError(res, `GET ${resultsRoute(collectionId)}`);
    records = await res.json();
  }
  const rows = records.map(({ id, data }) => ({ id, columns: collection.toColumns(id, data) }));
  return sortRows(collection, rows);
}

/** One record's whole response. `undefined` for an unknown id. */
export async function getResult(
  collectionId: string,
  id: string,
): Promise<StoredRecord | undefined> {
  const collection = getRecordCollection(collectionId);
  if (typeof window === "undefined") {
    const { readAsVisitor } = await import("./backend/visitor");
    const record = await readAsVisitor((store, uid) => store.getRecord(uid, collectionId, id));
    return record && withColumns(collection, record);
  }
  const res = await fetch(resultsRoute(collectionId, id), { cache: "no-store" });
  if (res.status === 404) return undefined;
  if (!res.ok) throw await storageError(res, `GET ${resultsRoute(collectionId, id)}`);
  return withColumns(collection, await res.json());
}

/**
 * Create or update. The server assigns row ids and stores the document; the
 * columns are derived from what it stored. Returns the record as stored.
 */
export async function saveResult(
  collectionId: string,
  id: string,
  data: SurveyData,
): Promise<StoredRecord> {
  if (typeof window === "undefined") {
    throw new Error("Records are written from the browser, through /api/storage");
  }
  const collection = getRecordCollection(collectionId);
  await beforeWrite();
  const res = await fetch(resultsRoute(collectionId, id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw await storageError(res, `PUT ${resultsRoute(collectionId, id)}`);
  return withColumns(collection, await res.json());
}

/** Delete one record. Deleting an unknown id is not an error. */
export async function deleteResult(collectionId: string, id: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Records are written from the browser, through /api/storage");
  }
  await beforeWrite();
  const res = await fetch(resultsRoute(collectionId, id), { method: "DELETE" });
  if (!res.ok) throw await storageError(res, `DELETE ${resultsRoute(collectionId, id)}`);
}

/**
 * A visitor completed a form that is not part of a records page — `/starter`.
 * This is where a real app POSTs the submission; this demo stores it in the
 * visitor's sandbox, and nothing reads it back.
 *
 * `schemaId` says which form it came from; `data` is keyed by question name and
 * already excludes answers hidden by `visibleIf` (see `clearInvisibleValues` in
 * the schemas).
 */
export async function submitResult(schemaId: string, data: SurveyData): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("A submission is sent from the browser, through /api/storage");
  }
  await beforeWrite();
  const route = `/api/storage/submissions/${encodeURIComponent(schemaId)}`;
  const res = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw await storageError(res, `POST ${route}`);
}

/**
 * "Reset demo data": everything this visitor stored is deleted and the browser
 * gets a new id. The caller reloads the page, which then reads the seed again.
 */
export async function resetDemoData(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Demo data is reset from the browser, through /api/storage");
  }
  await beforeWrite();
  const res = await fetch("/api/storage/reset", { method: "POST" });
  if (!res.ok) throw await storageError(res, "POST /api/storage/reset");
}
