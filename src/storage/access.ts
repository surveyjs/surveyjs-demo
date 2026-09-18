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

/**
 * A write a check refused: 422, with the sentence in `error` and the first thing
 * wrong beside it.
 *
 * It is a typed error rather than a sentence to parse, because the editor wants
 * the path — the MIT workbench selects the finding in its status bar, so the line
 * and the list point at the same place — and reading a JSON path back out of an
 * English sentence is the kind of thing that works until somebody rewrites the
 * sentence.
 */
export class StorageRefusal extends Error {
  /** Which check refused it: a definition's lint or tests, or a response's shape or validation. */
  readonly check: "lint" | "tests" | "response";
  /** The first thing wrong. `where` is a JSON path for a finding, `path` a question's for a response. */
  readonly first?: { message: string; where?: string; path?: string; name?: string; title?: string };
  readonly count: number;

  constructor(
    message: string,
    check: StorageRefusal["check"],
    first: StorageRefusal["first"],
    count: number,
  ) {
    super(message);
    this.name = "StorageRefusal";
    this.check = check;
    this.first = first;
    this.count = count;
  }
}

/** The error a storage route answered with, or the method, path and status. */
export async function storageError(response: Response, what: string): Promise<Error> {
  try {
    const body = (await response.json()) as {
      error?: unknown;
      check?: unknown;
      first?: unknown;
      count?: unknown;
    };
    if (typeof body.error === "string") {
      if (body.check === "lint" || body.check === "tests" || body.check === "response") {
        return new StorageRefusal(
          body.error,
          body.check,
          body.first as StorageRefusal["first"],
          typeof body.count === "number" ? body.count : 1,
        );
      }
      return new Error(body.error);
    }
  } catch {
    // Not JSON: fall through to the status.
  }
  return new Error(`${what}: ${response.status}`);
}
