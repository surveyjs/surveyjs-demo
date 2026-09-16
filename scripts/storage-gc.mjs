// Remove every demo visitor idle for longer than STORAGE_TTL_DAYS (default 14),
// with their definitions, records and documents. The template visitor is never
// removed.
//
//   npm run storage:gc
//   DATABASE_PATH=/data/demo.db STORAGE_TTL_DAYS=7 node scripts/storage-gc.mjs
//
// The app already does this lazily, at most once an hour after a write; this
// is the same cleanup on demand, for a cron job or by hand. No dependencies:
// Node's own node:sqlite. The SQL is owned by src/storage/backend/sqlite.ts
// (GC_SQL and TEMPLATE_UID); keep the two in step.

import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const TEMPLATE_UID = "00000000-0000-0000-0000-000000000000";

const file = process.env.DATABASE_PATH ?? ".data/demo.db";
if (file === ":memory:") {
  console.error("DATABASE_PATH is :memory:, which lives inside the app process; there is nothing to collect from here.");
  process.exit(1);
}
const resolved = path.resolve(file);
if (!existsSync(resolved)) {
  console.error(`No demo database at ${resolved}.`);
  process.exit(1);
}

const days = Number(process.env.STORAGE_TTL_DAYS ?? 14);
if (!Number.isFinite(days) || days <= 0) {
  console.error(`STORAGE_TTL_DAYS must be a positive number, not "${process.env.STORAGE_TTL_DAYS}".`);
  process.exit(1);
}

const db = new DatabaseSync(resolved, { timeout: 5000 });
// Per connection: without it the visitors' rows in the other tables would stay.
db.exec("PRAGMA foreign_keys = ON");
const { changes } = db
  .prepare("DELETE FROM visitors WHERE last_seen_at < datetime('now', ?) AND uid <> ?")
  .run(`-${days} days`, TEMPLATE_UID);
db.close();

console.log(`Removed ${changes} visitor${Number(changes) === 1 ? "" : "s"} idle for more than ${days} days.`);
