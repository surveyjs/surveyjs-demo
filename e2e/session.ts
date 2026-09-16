import { expect, type APIRequestContext } from "@playwright/test";

/**
 * Give a request context its own storage visitor, the way a page's handshake
 * does: the first call sets the `demo_uid` cookie, the second proves it stuck.
 * Every spec that writes through the storage API calls this first, on the same
 * context, because a write without the cookie is refused. `page.request` shares
 * the page's cookie jar, so a page and its request context are one visitor.
 */
export async function startSession(request: APIRequestContext): Promise<void> {
  await request.post("/api/storage/session");
  const second = await request.post("/api/storage/session");
  expect(await second.json()).toEqual({ ok: true });
}
