import type { SessionUser, SourceDocument, SurveyData, SurveyResult } from "./types";
import { leadsCollection } from "./collections/leads";
import { workOrdersCollection } from "./collections/work-order";

/**
 * A records page, described as data: what a list query returns, how a stored
 * response maps onto it, and how a new record starts.
 *
 * The split this file exists for is the one a real system of record makes. The
 * answers are stored whole, as a document; the handful of columns a list needs
 * are derived from that document on every write and stored beside it. The list
 * never reads the document, and nobody types a column by hand.
 *
 * Depends on `survey-core` types only — no React, no storage — so `e2e/` can
 * import it.
 */

/** A value a list column can hold. Plain data, as a database row would return it. */
export type ColumnValue = string | number | null;
export type RecordColumns = Readonly<Record<string, ColumnValue>>;

export interface RecordColumn {
  /** The column's name in storage, and the key in `RecordColumns`. */
  readonly key: string;
  readonly label: string;
  /** How the list renders the value. `money` reads its currency from `currencyKey`. */
  readonly kind: "id" | "text" | "badge" | "money" | "date";
  /** For `badge`: value → tone. The component maps tones to classes; no CSS here. */
  readonly tones?: Readonly<Record<string, "neutral" | "info" | "warning" | "success" | "danger">>;
  /** For `badge`: value → the text shown. Without an entry, the value with `_` as spaces. */
  readonly labels?: Readonly<Record<string, string>>;
  /** For `money`: the column holding an ISO 4217 code. Without one, USD. */
  readonly currencyKey?: string;
}

/** One row of the list query: the id and the columns, never the document. */
export interface RecordRow {
  readonly id: string;
  readonly columns: RecordColumns;
}

/** One stored record: the columns a list query returns, and the whole response. */
export interface StoredRecord extends RecordRow {
  readonly data: SurveyData;
}

export interface RecordCollection {
  /** The storage key, e.g. "workOrders". */
  readonly id: string;
  readonly schemaId: string;
  readonly noun: { readonly one: string; readonly many: string };
  readonly columns: readonly RecordColumn[];
  /**
   * Which columns the rail shows; every column is still derived and stored.
   * `primary` is the first line, `secondary` the second, both column keys.
   */
  readonly rail: { readonly primary: string; readonly secondary: readonly string[] };
  /** Which column names the record in the dialogs and the form heading. */
  readonly titleKey: string;
  /**
   * The columns written back on every save, derived from the document. Never
   * stored by hand: a seed record's columns come from here too.
   */
  readonly toColumns: (id: string, data: SurveyData) => RecordColumns;
  /** The id a new record gets, given the ones already stored. */
  readonly newId: (existing: readonly string[]) => string;
  /**
   * The document a new record starts from. `user` is the signed-in user, when
   * the page has one: a new record defaults from it here, in code, rather than
   * through `defaultValueExpression`, so loading an existing record never
   * re-derives a value somebody already entered.
   */
  readonly newRecord: (id: string, user: SessionUser | undefined) => SurveyData;
  /** List order. Stable: ties keep insertion order. */
  readonly compare?: (a: RecordColumns, b: RecordColumns) => number;
  readonly seed: readonly SurveyResult[];
  /**
   * Top-level arrays of the document whose items carry a stable `id`: the
   * dynamic panels and matrices. Storage fills a missing one on save, so a later
   * change can address a row rather than its index.
   */
  readonly rowIdContainers?: readonly string[];
  /**
   * Is this record one the collection calls a draft? A draft may be incomplete —
   * a record read off a document is one until somebody reviews it — so the write
   * route checks its shape and skips completeness. Malformed is still refused.
   *
   * The client controls the status, and that is fine: marking your own record a
   * draft gets you a draft, in your own sandbox.
   */
  readonly isDraft?: (data: SurveyData) => boolean;
  /**
   * How `createFrom` turns answers read from a document into a record. Without
   * it, `newId` names the record and `newRecord` wins over every answer.
   */
  readonly fromDocument?: {
    /** The id the document itself carries, when usable; `undefined` falls back to `newId`. */
    readonly id?: (data: SurveyData, existing: readonly string[]) => string | undefined;
    /**
     * Values forced over the answers: the id field, the draft status, and where the
     * record came from. The rest of `newRecord` only fills what the document left blank.
     */
    readonly pinned: (id: string, source: SourceDocument | undefined) => SurveyData;
  };
}

/** Every records page's collection, by storage key. */
export const recordCollections: Record<string, RecordCollection> = {
  [leadsCollection.id]: leadsCollection,
  [workOrdersCollection.id]: workOrdersCollection,
};

/**
 * Path segments a record id may not be, because a static route under a records
 * page already owns them: `/work-orders/how` is the explainer and
 * `/work-orders/from-document` the import panel, so a record called `how` would
 * be unreachable at its own URL and would shadow one of those pages instead.
 *
 * No `newId` here can produce one, and `fromDocument.id` refuses one — a
 * document must not be able to name a record after a route.
 */
export const RESERVED_RECORD_IDS: readonly string[] = ["how", "from-document"];

export function isReservedRecordId(id: unknown): boolean {
  return typeof id === "string" && RESERVED_RECORD_IDS.includes(id);
}

export function getRecordCollection(id: string): RecordCollection {
  const collection = recordCollections[id];
  if (!collection) throw new Error(`Unknown record collection: ${id}`);
  return collection;
}

/**
 * Rows in the collection's order. `Array.prototype.sort` is stable, so without
 * a `compare`, or on a tie, rows keep the order they were stored in.
 */
export function sortRows<T extends RecordRow>(collection: RecordCollection, rows: readonly T[]): T[] {
  const { compare } = collection;
  return compare ? [...rows].sort((a, b) => compare(a.columns, b.columns)) : [...rows];
}

/** The record's name, as the list's `titleKey` column holds it. */
export function recordTitle(collection: RecordCollection, row: RecordRow): string {
  const value = row.columns[collection.titleKey];
  return value === null || value === undefined || value === "" ? row.id : String(value);
}

/**
 * A copy of `data` in which every object item of each named top-level array has
 * a non-empty string `id`. Items that have one keep it; the rest get
 * `crypto.randomUUID()`. Never an index, so two clients adding rows at once
 * cannot collide. Arrays not named, and non-object items, are left alone.
 */
export function assignRowIds(data: SurveyData, containers: readonly string[]): SurveyData {
  const result: Record<string, unknown> = { ...data };
  for (const name of containers) {
    const items = data[name];
    if (!Array.isArray(items)) continue;
    result[name] = items.map((item) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) return item;
      const { id } = item as { id?: unknown };
      return typeof id === "string" && id !== "" ? item : { ...item, id: crypto.randomUUID() };
    });
  }
  return result;
}
