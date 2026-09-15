import type { SessionUser, SurveyData, SurveyResult } from "./types";
import { claimsCollection } from "./collections/insurance-claim";
import { leadsCollection } from "./collections/leads";

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
  /** The storage key, e.g. "claims". */
  readonly id: string;
  readonly schemaId: string;
  readonly noun: { readonly one: string; readonly many: string };
  readonly columns: readonly RecordColumn[];
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
}

/** Every records page's collection, by storage key. */
export const recordCollections: Record<string, RecordCollection> = {
  [claimsCollection.id]: claimsCollection,
  [leadsCollection.id]: leadsCollection,
};

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
