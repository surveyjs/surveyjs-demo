/**
 * The manifest guard: a remote manifest is data from another repository, so it
 * is checked before anything renders from it.
 *
 * Hand-written rather than a schema library, for one small shape. It throws on
 * the first violation with the path that broke, which is what the loader logs
 * before it falls back to the bundled copy. No React: `e2e/` imports it.
 */
import type { ExampleEntry, ExamplesManifest } from "./types";

/** `related` names at most this many other entries: the "See next" card has room for two. */
export const MAX_RELATED = 2;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(where: string, what: string): never {
  throw new Error(`examples manifest: ${where} ${what}`);
}

function text(entry: Record<string, unknown>, key: string, where: string): string {
  const value = entry[key];
  if (typeof value !== "string" || value.trim() === "") fail(`${where}.${key}`, "must be a non-empty string");
  return value;
}

function https(value: unknown, where: string): string {
  if (typeof value !== "string") fail(where, "must be a string");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail(where, `is not a URL: ${value}`);
  }
  if (url.protocol !== "https:") fail(where, `must be https://: ${value}`);
  return value;
}

function parseEntry(value: unknown, where: string): ExampleEntry {
  if (!isObject(value)) fail(where, "must be an object");

  const id = text(value, "id", where);
  const name = text(value, "name", where);
  const problem = text(value, "problem", where);

  if (typeof value.ready !== "boolean") fail(`${where}.ready`, "must be a boolean");
  if (value.inMenu !== undefined && typeof value.inMenu !== "boolean") {
    fail(`${where}.inMenu`, "must be a boolean when set");
  }
  if (value.useCaseAnchor !== undefined && typeof value.useCaseAnchor !== "string") {
    fail(`${where}.useCaseAnchor`, "must be a string when set");
  }

  const hasRun = value.runUrl !== undefined;
  const hasUrl = value.url !== undefined;
  if (hasRun === hasUrl) fail(where, "must set exactly one of runUrl and url");

  let runUrl: ExampleEntry["runUrl"];
  if (hasRun) {
    if (!isObject(value.runUrl)) fail(`${where}.runUrl`, "must be { mit, full }");
    runUrl = {
      mit: https(value.runUrl.mit, `${where}.runUrl.mit`),
      full: https(value.runUrl.full, `${where}.runUrl.full`),
    };
  }
  const url = hasUrl ? https(value.url, `${where}.url`) : undefined;

  if (!Array.isArray(value.related) || !value.related.every((item) => typeof item === "string")) {
    fail(`${where}.related`, "must be an array of ids");
  }

  return {
    id,
    name,
    problem,
    ...(runUrl ? { runUrl } : {}),
    ...(url ? { url } : {}),
    ...(value.useCaseAnchor !== undefined ? { useCaseAnchor: value.useCaseAnchor as string } : {}),
    ready: value.ready,
    related: value.related as string[],
    ...(value.inMenu !== undefined ? { inMenu: value.inMenu as boolean } : {}),
  };
}

/**
 * A manifest, or an error naming the first thing wrong: unique ids, `related`
 * naming at most two other entries and never itself, exactly one of `runUrl`
 * and `url`, and every URL `https://`.
 */
export function parseManifest(value: unknown): ExamplesManifest {
  if (!isObject(value)) fail("the root", "must be an object");
  if (value.version !== 1) fail("version", `must be 1, not ${JSON.stringify(value.version)}`);
  if (!Array.isArray(value.entries)) fail("entries", "must be an array");

  const entries = value.entries.map((entry, index) => parseEntry(entry, `entries[${index}]`));

  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) fail(`entry "${entry.id}"`, "is listed twice");
    ids.add(entry.id);
  }
  for (const entry of entries) {
    if (entry.related.length > MAX_RELATED) {
      fail(`entry "${entry.id}".related`, `names more than ${MAX_RELATED} entries`);
    }
    for (const other of entry.related) {
      if (other === entry.id) fail(`entry "${entry.id}".related`, "names the entry itself");
      if (!ids.has(other)) fail(`entry "${entry.id}".related`, `names "${other}", which is not an entry`);
    }
  }

  return { version: 1, entries };
}
