import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { recordCollections, schemaRegistry, type SurveyData, type SurveyJSON } from "@/schemas";

/**
 * The one storage backend: every visitor's definitions, records and uploaded
 * documents, in one SQLite file, through the `node:sqlite` built into Node.
 *
 * This is the swap the storage seams (`../survey-json.ts`, `../survey-results.ts`,
 * `../documents.ts`) describe, done against a real database. They call it
 * directly on the server and reach it through `src/app/api/storage/` from the
 * browser. It imports nothing from Next.js, so a script, a test or another
 * server on this host can open the same file; WAL makes two processes safe.
 *
 * **The template visitor.** The definitions and seed records that ship in
 * `src/schemas` are rows too, under `TEMPLATE_UID`, rewritten from the code every
 * time the database is opened. A visitor with no row reads the template. Their
 * first write copies every template row under their own id, in one statement per
 * table, so from then on their rows are the whole truth: an emptied collection
 * stays empty, and no per-form marker is needed.
 *
 * Every operation is synchronous and takes the visitor's id first. Writes go
 * through `write`, which creates the visitor, keeps `last_seen_at` fresh and
 * enforces the caps inside one transaction.
 */

/** The visitor the shipped definitions and seed records are stored under. Never a cookie. */
export const TEMPLATE_UID = "00000000-0000-0000-0000-000000000000";

/** Bump when the tables change: a database at another version is dropped and recreated. */
export const SCHEMA_VERSION = 1;

/** One JSON value: a definition or a record, measured in UTF-8 bytes. */
export const MAX_VALUE_BYTES = 1_048_576;
/** One uploaded document. `/api/extract` refuses a larger one too. */
export const MAX_DOCUMENT_BYTES = 8 * 1_048_576;
/** Everything one visitor stores, documents included. */
export const MAX_VISITOR_BYTES = 50 * 1_048_576;

const LIMIT_MESSAGE =
  "This demo stores up to 1 MB per form, 8 MB per document and 50 MB per visitor.";

/** A write over one of the caps. The route answers 413 with this message. */
export class StorageLimitError extends Error {
  constructor() {
    super(LIMIT_MESSAGE);
    this.name = "StorageLimitError";
  }
}

/** Idle days before the GC removes a visitor, unless `STORAGE_TTL_DAYS` says otherwise. */
export const DEFAULT_TTL_DAYS = 14;
const GC_INTERVAL_MS = 60 * 60 * 1000;

/**
 * The document types the store accepts, which are the ones the upload input
 * offers. Decided by the bytes, never by the name or the type a client claims:
 * a document is served to whoever has its URL, so an HTML page renamed `x.png`
 * must not get in.
 */
export const DOCUMENT_TYPES = [
  { type: "application/pdf", magic: [[0, "%PDF-"]] },
  { type: "image/png", magic: [[0, "\x89PNG\r\n\x1a\n"]] },
  { type: "image/jpeg", magic: [[0, "\xff\xd8\xff"]] },
  { type: "image/webp", magic: [[0, "RIFF"], [8, "WEBP"]] },
] as const satisfies readonly { type: string; magic: readonly (readonly [number, string])[] }[];

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["type"];

/** The type the bytes are, or `null` when they are none of `DOCUMENT_TYPES`. */
export function sniffDocumentType(bytes: Uint8Array): DocumentType | null {
  const found = DOCUMENT_TYPES.find(({ magic }) =>
    magic.every(([offset, signature]) =>
      [...signature].every((char, i) => bytes[offset + i] === char.charCodeAt(0)),
    ),
  );
  return found?.type ?? null;
}

/** A UTC timestamp SQLite compares against `datetime('now', …)`, to the millisecond. */
function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

/** Refuse a value over `MAX_VALUE_BYTES`, counted in bytes, not characters. */
function serialize(value: unknown): string {
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json) > MAX_VALUE_BYTES) throw new StorageLimitError();
  return json;
}

function assertNodeVersion(): void {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 24 || (major === 24 && minor < 16)) {
    throw new Error(
      `Node ${process.versions.node} cannot run this demo's storage: node:sqlite before 24.16 ` +
        "truncates stored text at a NUL character. Use Node 24.16 or later.",
    );
  }
}

const TABLES = `
  CREATE TABLE IF NOT EXISTS meta (schema_version INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS visitors (
    uid TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS definitions (
    uid TEXT NOT NULL REFERENCES visitors(uid) ON DELETE CASCADE,
    form_id TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (uid, form_id)
  );
  CREATE TABLE IF NOT EXISTS data_records (
    uid TEXT NOT NULL REFERENCES visitors(uid) ON DELETE CASCADE,
    form_id TEXT NOT NULL,
    record_id TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (uid, form_id, record_id)
  );
  CREATE TABLE IF NOT EXISTS documents (
    doc_id TEXT PRIMARY KEY,
    uid TEXT NOT NULL REFERENCES visitors(uid) ON DELETE CASCADE,
    form_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    bytes BLOB NOT NULL,
    created_at TEXT NOT NULL
  );
`;

const DROP_TABLES = `
  DROP TABLE IF EXISTS documents;
  DROP TABLE IF EXISTS data_records;
  DROP TABLE IF EXISTS definitions;
  DROP TABLE IF EXISTS visitors;
  DROP TABLE IF EXISTS meta;
`;

/**
 * The GC's one statement. `scripts/storage-gc.mjs` runs the same SQL; this file
 * owns it. Documents, definitions and records go with the visitor row.
 */
const GC_SQL = "DELETE FROM visitors WHERE last_seen_at < datetime('now', ?) AND uid <> ?";

export interface StoredDocument {
  readonly name: string;
  readonly type: string;
  readonly bytes: Uint8Array;
}

/** An open database and every operation on it. */
export class DemoStore {
  private lastGc = 0;

  constructor(readonly db: DatabaseSync) {}

  close(): void {
    this.db.close();
  }

  /** `BEGIN IMMEDIATE`, so two writers queue on the lock rather than fail on upgrade. */
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (failure) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      throw failure;
    }
  }

  /**
   * The writing rule, for every write a visitor makes. In one transaction: their
   * copy of the template when they have no row yet, the write itself,
   * `last_seen_at`, and the total, checked after the write so a replacement counts
   * its new size and the first-write copy counts too. Over the cap, all of it
   * rolls back. The lazy GC runs only once that has committed, so it can never
   * collect a visitor who just came back.
   */
  write<T>(uid: string, fn: () => T): T {
    const result = this.transaction(() => {
      if (!this.visitorExists(uid)) this.createVisitor(uid);
      const value = fn();
      this.touchVisitor(uid);
      if (this.totalBytes(uid) > MAX_VISITOR_BYTES) throw new StorageLimitError();
      return value;
    });
    this.lazyGc();
    return result;
  }

  /** Rewrite the template visitor from `src/schemas`, in one transaction. */
  syncTemplate(): void {
    this.transaction(() => {
      const at = now();
      this.db.prepare("DELETE FROM visitors WHERE uid = ?").run(TEMPLATE_UID);
      this.db
        .prepare("INSERT INTO visitors (uid, created_at, last_seen_at) VALUES (?, ?, ?)")
        .run(TEMPLATE_UID, at, at);
      const definition = this.db.prepare(
        "INSERT INTO definitions (uid, form_id, json, updated_at) VALUES (?, ?, ?, ?)",
      );
      for (const schema of Object.values(schemaRegistry)) {
        definition.run(TEMPLATE_UID, schema.id, JSON.stringify(schema.json), at);
      }
      // Documents only: a list's columns are derived from them on every read.
      const record = this.db.prepare(
        "INSERT INTO data_records (uid, form_id, record_id, json, updated_at) VALUES (?, ?, ?, ?, ?)",
      );
      for (const collection of Object.values(recordCollections)) {
        for (const seed of collection.seed) {
          record.run(TEMPLATE_UID, collection.id, seed.id, JSON.stringify(seed.data), at);
        }
      }
    });
  }

  visitorExists(uid: string): boolean {
    return this.db.prepare("SELECT 1 FROM visitors WHERE uid = ?").get(uid) !== undefined;
  }

  /**
   * A visitor's own copy of every template row. Inside a write transaction only:
   * the visitor row and its copies exist together or not at all. The template
   * has no documents, so there is nothing to copy there.
   */
  createVisitor(uid: string): void {
    if (!this.db.isTransaction) {
      throw new Error("createVisitor runs inside a write transaction.");
    }
    const at = now();
    this.db
      .prepare("INSERT INTO visitors (uid, created_at, last_seen_at) VALUES (?, ?, ?)")
      .run(uid, at, at);
    this.db
      .prepare(
        "INSERT INTO definitions (uid, form_id, json, updated_at) SELECT ?, form_id, json, ? FROM definitions WHERE uid = ?",
      )
      .run(uid, at, TEMPLATE_UID);
    this.db
      .prepare(
        "INSERT INTO data_records (uid, form_id, record_id, json, updated_at) SELECT ?, form_id, record_id, json, ? FROM data_records WHERE uid = ? ORDER BY rowid",
      )
      .run(uid, at, TEMPLATE_UID);
  }

  /** Everything a visitor stored, in one statement: the rest cascades. */
  deleteVisitor(uid: string): void {
    if (uid === TEMPLATE_UID) throw new Error("The template visitor is never deleted.");
    this.db.prepare("DELETE FROM visitors WHERE uid = ?").run(uid);
  }

  /**
   * Mark the visitor as seen, at most once a day. Never inserts, so a read with a
   * well-formed cookie nobody wrote under creates nothing.
   */
  touchVisitor(uid: string): void {
    this.db
      .prepare(
        "UPDATE visitors SET last_seen_at = ? WHERE uid = ? AND last_seen_at < date('now', '-1 day')",
      )
      .run(now(), uid);
  }

  /** What a visitor stores, in bytes: both JSON tables and the documents. */
  totalBytes(uid: string): number {
    const row = this.db
      .prepare(
        `SELECT
          (SELECT COALESCE(SUM(octet_length(json)), 0) FROM definitions WHERE uid = ?1) +
          (SELECT COALESCE(SUM(octet_length(json)), 0) FROM data_records WHERE uid = ?1) +
          (SELECT COALESCE(SUM(length(bytes)), 0) FROM documents WHERE uid = ?1) AS total`,
      )
      .get(uid) as { total: number };
    return Number(row.total);
  }

  /** Remove every visitor idle for more than `ttlDays`, never the template. Returns how many. */
  gc(ttlDays: number): number {
    const { changes } = this.db.prepare(GC_SQL).run(`-${ttlDays} days`, TEMPLATE_UID);
    return Number(changes);
  }

  /** Once an hour at most, and only ever after a committed write. */
  private lazyGc(): void {
    if (Date.now() - this.lastGc < GC_INTERVAL_MS) return;
    this.lastGc = Date.now();
    this.gc(ttlDays());
  }

  /* ── definitions ───────────────────────────────────────────────────────── */

  getDefinition(uid: string, formId: string): SurveyJSON | undefined {
    const row = this.db
      .prepare("SELECT json FROM definitions WHERE uid = ? AND form_id = ?")
      .get(uid, formId) as { json: string } | undefined;
    return row && (JSON.parse(row.json) as SurveyJSON);
  }

  putDefinition(uid: string, formId: string, json: SurveyJSON): void {
    this.db
      .prepare(
        `INSERT INTO definitions (uid, form_id, json, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (uid, form_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
      )
      .run(uid, formId, serialize(json), now());
  }

  /** The editor's per-form Reset: the template's row for that one form. */
  copyTemplateDefinition(uid: string, formId: string): void {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO definitions (uid, form_id, json, updated_at) SELECT ?, form_id, json, ? FROM definitions WHERE uid = ? AND form_id = ?",
      )
      .run(uid, now(), TEMPLATE_UID, formId);
  }

  /* ── records ───────────────────────────────────────────────────────────── */

  /** In the order they were first stored: an update keeps its place. */
  listRecords(uid: string, formId: string): { id: string; data: SurveyData }[] {
    const rows = this.db
      .prepare("SELECT record_id, json FROM data_records WHERE uid = ? AND form_id = ? ORDER BY rowid")
      .all(uid, formId) as { record_id: string; json: string }[];
    return rows.map((row) => ({ id: row.record_id, data: JSON.parse(row.json) as SurveyData }));
  }

  getRecord(uid: string, formId: string, recordId: string): { id: string; data: SurveyData } | undefined {
    const row = this.db
      .prepare("SELECT json FROM data_records WHERE uid = ? AND form_id = ? AND record_id = ?")
      .get(uid, formId, recordId) as { json: string } | undefined;
    return row && { id: recordId, data: JSON.parse(row.json) as SurveyData };
  }

  putRecord(uid: string, formId: string, recordId: string, data: SurveyData): void {
    this.db
      .prepare(
        `INSERT INTO data_records (uid, form_id, record_id, json, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (uid, form_id, record_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
      )
      .run(uid, formId, recordId, serialize(data), now());
  }

  deleteRecord(uid: string, formId: string, recordId: string): void {
    this.db
      .prepare("DELETE FROM data_records WHERE uid = ? AND form_id = ? AND record_id = ?")
      .run(uid, formId, recordId);
  }

  /* ── documents ─────────────────────────────────────────────────────────── */

  /**
   * Store an upload and return its id. The type stored is the one the bytes
   * are; whatever the client said is not asked for.
   */
  putDocument(uid: string, formId: string, name: string, bytes: Uint8Array): string {
    if (bytes.byteLength > MAX_DOCUMENT_BYTES) throw new StorageLimitError();
    const type = sniffDocumentType(bytes);
    if (!type) throw new Error("Only PDF, PNG, JPEG and WebP documents are stored.");
    const docId = randomUUID();
    this.db
      .prepare(
        "INSERT INTO documents (doc_id, uid, form_id, name, type, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(docId, uid, formId, name, type, bytes, now());
    return docId;
  }

  getDocument(docId: string): StoredDocument | undefined {
    const row = this.db
      .prepare("SELECT name, type, bytes FROM documents WHERE doc_id = ?")
      .get(docId) as { name: string; type: string; bytes: Uint8Array } | undefined;
    return row && { name: row.name, type: row.type, bytes: row.bytes };
  }
}

function ttlDays(): number {
  const days = Number(process.env.STORAGE_TTL_DAYS);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_TTL_DAYS;
}

/**
 * Open (creating when needed) the database at `file`, bring its tables to
 * `schemaVersion`, and rewrite the template. For tests; the app calls
 * `getDatabase`.
 */
export function openDatabase(file: string, schemaVersion: number): DemoStore {
  assertNodeVersion();
  const memory = file === ":memory:";
  const resolved = memory ? file : path.resolve(file);

  let db: DatabaseSync;
  try {
    if (!memory) mkdirSync(path.dirname(resolved), { recursive: true });
    // A writer waits for another process's lock rather than failing at once.
    db = new DatabaseSync(resolved, { timeout: 5000 });
    if (!memory) db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
  } catch (failure) {
    throw new Error(
      `Could not open the demo database at ${resolved}: ${(failure as Error).message}`,
      { cause: failure },
    );
  }

  const store = new DemoStore(db);
  store.transaction(() => {
    db.exec(TABLES);
    const meta = db.prepare("SELECT schema_version FROM meta").get() as
      | { schema_version: number }
      | undefined;
    if (meta && meta.schema_version !== schemaVersion) {
      db.exec(DROP_TABLES);
      db.exec(TABLES);
    }
    if (!meta || meta.schema_version !== schemaVersion) {
      db.prepare("INSERT INTO meta (schema_version) VALUES (?)").run(schemaVersion);
    }
  });
  store.syncTemplate();
  return store;
}

const GLOBAL_KEY = Symbol.for("surveyjs-demo.database");
type WithDatabase = typeof globalThis & { [GLOBAL_KEY]?: DemoStore };

/**
 * The app's one database, opened at the first call. Held on `globalThis`, not in
 * a module variable: Next.js instantiates this module once per route bundle, and
 * with `:memory:` a page and a route handler must share one database; it also
 * survives hot reload in development. A failure to open is not cached, so every
 * request reports it with the path until it is fixed.
 */
export function getDatabase(): DemoStore {
  const holder = globalThis as WithDatabase;
  holder[GLOBAL_KEY] ??= openDatabase(process.env.DATABASE_PATH ?? ".data/demo.db", SCHEMA_VERSION);
  return holder[GLOBAL_KEY];
}
