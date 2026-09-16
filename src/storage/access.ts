/**
 * Whether this browser can keep what it stores: the handshake behind the
 * read-only banner, and the step every client-side write waits for.
 *
 * Storage is keyed by the `demo_uid` cookie, which `/api/storage/session` sets
 * when a request arrives without one. So the page asks once; if the answer is
 * `ok: false`, the cookie was set on that response and it asks again. A second
 * `ok: false` means the browser threw the cookie away, and every write would be
 * refused, so the page shows the demo read-only instead of failing on each save.
 *
 * Memoized per page load. A save made in the first moments after load waits
 * for the handshake here, rather than reaching the server before the cookie
 * does. No React: `src/components/StorageAccess.tsx` holds the state.
 */

export type StorageAccess = "writable" | "read-only";

/** What the banner says, and what a write without a cookie is refused with. */
export const READ_ONLY_MESSAGE =
  "This browser blocks cookies, so the demo is read-only: nothing you change here can be kept. Allow cookies for this site to get your own sandbox.";

let pending: Promise<StorageAccess> | null = null;

async function session(): Promise<boolean> {
  const response = await fetch("/api/storage/session", { method: "POST", cache: "no-store" });
  const body = (await response.json()) as { ok?: unknown };
  if (typeof body.ok !== "boolean") throw new Error("Unexpected handshake answer.");
  return body.ok;
}

export function checkStorageAccess(): Promise<StorageAccess> {
  pending ??= (async (): Promise<StorageAccess> => {
    if (await session()) return "writable";
    return (await session()) ? "writable" : "read-only";
  })().catch(() => {
    // A network failure or a garbled answer proves nothing about cookies. Ask
    // again next time, and let the write that follows report its own error.
    pending = null;
    return "writable";
  });
  return pending;
}

/** Every client-side write starts here: after the handshake, and never from a read-only browser. */
export async function beforeWrite(): Promise<void> {
  if ((await checkStorageAccess()) === "read-only") throw new Error(READ_ONLY_MESSAGE);
}

/** The error a storage route answered with, or the method, path and status. */
export async function storageError(response: Response, what: string): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return new Error(body.error);
  } catch {
    // Not JSON: fall through to the status.
  }
  return new Error(`${what}: ${response.status}`);
}
