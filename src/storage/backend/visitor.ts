import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { READ_ONLY_MESSAGE } from "../access";
import { getDatabase, StorageLimitError, TEMPLATE_UID, type DemoStore } from "./sqlite";

// What the banner shows and a refused write answers. Written in `../access.ts`,
// which the browser can import.
export { READ_ONLY_MESSAGE };

/**
 * Who the storage is read and written for: the `demo_uid` cookie. Server-only,
 * and the one file that reads a request's cookies.
 *
 * The cookie is a random id and nothing else: no name, no tracking, no row until
 * the visitor first writes. Only two routes issue one, `/api/storage/session`
 * (the page's handshake) and `/api/storage/reset`; nothing else sets it, so a
 * crawler reading pages gets no header at all.
 */

export const COOKIE = "demo_uid";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A write from a browser that presented no valid cookie. The route answers 403. */
export class ReadOnlyError extends Error {
  constructor() {
    super(READ_ONLY_MESSAGE);
    this.name = "ReadOnlyError";
  }
}

/**
 * The request's visitor id, or `null`: no cookie, a malformed one, or the
 * template's own id, none of which may ever reach SQL. Also `null` outside a
 * request (a build, a test process), where `cookies()` throws.
 */
export async function readVisitor(): Promise<string | null> {
  let value: string | undefined;
  try {
    // Imported here, not at the top: the seams reach this file from client
    // components too, on their server branch, and Next.js refuses a static
    // `next/headers` import anywhere in a client component's module graph.
    const { cookies } = await import("next/headers");
    value = (await cookies()).get(COOKIE)?.value;
  } catch (failure) {
    // While Next.js prerenders, reading cookies throws on purpose to mark the
    // page as rendered per request. That one is Next's, so it goes back up.
    unstable_rethrow(failure);
    return null;
  }
  return value && UUID.test(value) && value !== TEMPLATE_UID ? value.toLowerCase() : null;
}

/** A fresh visitor id, set on `response`. Nothing is written until they write. */
export function issueVisitor(response: NextResponse): string {
  const uid = randomUUID();
  response.cookies.set(COOKIE, uid, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 31_536_000,
    path: "/",
  });
  return uid;
}

/** The visitor a write is for; without a valid cookie there is nobody to keep it for. */
export async function requireVisitor(): Promise<string> {
  const uid = await readVisitor();
  if (!uid) throw new ReadOnlyError();
  return uid;
}

/**
 * The reading rule, in one place, for the seams and the route handlers alike:
 * the visitor's own rows when they have any, otherwise the template's.
 */
export async function readAsVisitor<T>(read: (store: DemoStore, uid: string) => T): Promise<T> {
  // The cookie first: while a page prerenders, that throw is what makes it
  // dynamic, and the database is then never opened at build time.
  const uid = await readVisitor();
  const store = getDatabase();
  const own = uid !== null && store.visitorExists(uid);
  const result = read(store, own ? uid : TEMPLATE_UID);
  // A read of the visitor's own rows marks them as seen; the template's never does.
  if (own) store.touchVisitor(uid);
  return result;
}

/**
 * The writing rule, for the route handlers: a valid cookie or nothing is written,
 * then `DemoStore.write` (the visitor's copy of the template on their first
 * write, the write, `last_seen_at`, the total, one transaction, then the GC).
 */
export async function writeAsVisitor<T>(write: (store: DemoStore, uid: string) => T): Promise<T> {
  const uid = await requireVisitor();
  const store = getDatabase();
  return store.write(uid, () => write(store, uid));
}

/** The two refusals a visitor is shown, as responses; anything else is a real failure. */
export function refusal(failure: unknown): NextResponse {
  if (failure instanceof ReadOnlyError) {
    return NextResponse.json({ error: failure.message }, { status: 403 });
  }
  if (failure instanceof StorageLimitError) {
    return NextResponse.json({ error: failure.message }, { status: 413 });
  }
  throw failure;
}

/** A request body that is a JSON object, or `null`. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return asObject(await request.json());
  } catch {
    return null;
  }
}

/** `value` when it is a JSON object: a definition or a record's document. */
export function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
