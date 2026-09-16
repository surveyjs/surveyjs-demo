import { NextResponse } from "next/server";
import { issueVisitor, readVisitor } from "@/storage/backend/visitor";

/**
 * The page's storage handshake, called once after load by
 * `src/storage/access.ts`. With a valid `demo_uid` it answers `{ ok: true }`.
 * Without one it sets a fresh cookie and answers `{ ok: false }`; the page then
 * calls again, and a second `ok: false` means the browser did not keep the
 * cookie, so the demo is read-only there.
 *
 * It writes no row: a crawler that runs the page's script gets a header and
 * nothing else. The visitor's row appears with their first write.
 */
export const runtime = "nodejs";

export async function POST() {
  if (await readVisitor()) return NextResponse.json({ ok: true });
  const response = NextResponse.json({ ok: false });
  issueVisitor(response);
  return response;
}
