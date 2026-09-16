import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { recordCollections, schemaRegistry } from "../src/schemas";
import { openDatabase, TEMPLATE_UID } from "../src/storage/backend/sqlite";

/**
 * The storage backend with no server and no browser: `sqlite.ts` imported
 * straight into the test process, which is also the proof that it needs nothing
 * from Next.js. Each test opens a temp file of its own, never the run's shared
 * database.
 */

const seedRecords = Object.values(recordCollections).reduce((sum, collection) => sum + collection.seed.length, 0);

function tempDatabase(): string {
  return path.join(os.tmpdir(), `sjs-demo-backend-${randomUUID()}.db`);
}

function removeDatabase(file: string): void {
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${file}${suffix}`, { force: true });
}

function count(store: ReturnType<typeof openDatabase>, table: string, uid: string): number {
  return (store.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE uid = ?`).get(uid) as { n: number }).n;
}

test("the template is written at open, copied on a first write, and a version bump starts over", () => {
  const file = tempDatabase();
  try {
    const store = openDatabase(file, 1);
    expect(count(store, "definitions", TEMPLATE_UID)).toBe(Object.keys(schemaRegistry).length);
    expect(count(store, "data_records", TEMPLATE_UID)).toBe(seedRecords);

    const uid = randomUUID();
    store.write(uid, () => store.putDefinition(uid, "checkout", { title: "Mine" }));
    expect(count(store, "definitions", uid)).toBe(Object.keys(schemaRegistry).length);
    expect(count(store, "data_records", uid)).toBe(seedRecords);
    expect(store.getDefinition(uid, "checkout")).toEqual({ title: "Mine" });
    expect(store.getDefinition(TEMPLATE_UID, "checkout")).toEqual(schemaRegistry.checkout.json);
    store.close();

    // The same version keeps the visitor.
    const same = openDatabase(file, 1);
    expect(same.visitorExists(uid)).toBe(true);
    same.close();

    // Another version drops every table and writes the template again.
    const bumped = openDatabase(file, 2);
    expect(bumped.visitorExists(uid)).toBe(false);
    expect(bumped.db.prepare("SELECT uid FROM visitors").all()).toEqual([expect.objectContaining({ uid: TEMPLATE_UID })]);
    expect(count(bumped, "data_records", TEMPLATE_UID)).toBe(seedRecords);
    expect(bumped.db.prepare("SELECT schema_version FROM meta").all()).toEqual([
      expect.objectContaining({ schema_version: 2 }),
    ]);
    bumped.close();
  } finally {
    removeDatabase(file);
  }
});

test("the GC script removes an idle visitor with everything they stored, never the template", () => {
  const file = tempDatabase();
  try {
    const store = openDatabase(file, 1);
    const [idle, fresh] = [randomUUID(), randomUUID()];
    const pdf = new Uint8Array(Buffer.from("%PDF-1.4\n% kept by an idle visitor\n"));
    for (const uid of [idle, fresh]) {
      store.write(uid, () => store.putDocument(uid, "workOrders", "sheet.pdf", pdf));
    }
    store.db
      .prepare("UPDATE visitors SET last_seen_at = datetime('now', '-15 days') WHERE uid IN (?, ?)")
      .run(idle, TEMPLATE_UID);
    store.close();

    const output = execFileSync(process.execPath, [path.join("scripts", "storage-gc.mjs")], {
      env: { ...process.env, DATABASE_PATH: file, STORAGE_TTL_DAYS: "14" },
      encoding: "utf8",
    });
    expect(output).toContain("Removed 1 visitor");

    const after = openDatabase(file, 1);
    expect(after.visitorExists(idle)).toBe(false);
    for (const table of ["definitions", "data_records", "documents"]) {
      expect(count(after, table, idle), table).toBe(0);
    }
    expect(after.visitorExists(fresh)).toBe(true);
    expect(count(after, "documents", fresh)).toBe(1);
    expect(after.visitorExists(TEMPLATE_UID)).toBe(true);
    after.close();
  } finally {
    removeDatabase(file);
  }
});

test("totalBytes counts UTF-8 bytes, not characters", () => {
  const file = tempDatabase();
  try {
    const store = openDatabase(file, 1);
    const uid = randomUUID();
    store.write(uid, () => store.putDefinition(uid, "checkout", { title: "x" }));
    const before = store.totalBytes(uid);

    const title = "Zürich — 東京 — 🚚";
    store.write(uid, () => store.putDefinition(uid, "checkout", { title }));
    const grown =
      Buffer.byteLength(JSON.stringify({ title })) - Buffer.byteLength(JSON.stringify({ title: "x" }));
    expect(store.totalBytes(uid) - before).toBe(grown);
    expect(grown).toBeGreaterThan(JSON.stringify({ title }).length - JSON.stringify({ title: "x" }).length);
    store.close();
  } finally {
    removeDatabase(file);
  }
});
