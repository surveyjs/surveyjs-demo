import { NextResponse } from "next/server";
import { getDatabase, sniffDocumentType } from "@/storage/backend/sqlite";

/**
 * A stored document's bytes, to whoever has the URL. The id is a random UUID,
 * and that is the whole of the access control, which is why the response is
 * locked down: `Content-Security-Policy: sandbox` renders it in an opaque origin,
 * so not even a PDF viewer's scripts can reach this site or its storage API,
 * and `nosniff` holds the browser to the type the bytes were checked to be.
 */
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The name for `Content-Disposition`: printable ASCII, no quotes or backslashes. */
function asciiName(name: string): string {
  const safe = name
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\]/g, "")
    .trim();
  return safe || "document";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const document = UUID.test(id) ? getDatabase().getDocument(id.toLowerCase()) : undefined;
  const type = document && sniffDocumentType(document.bytes);
  if (!document || !type) {
    return NextResponse.json({ error: "Unknown document." }, { status: 404 });
  }
  return new NextResponse(Buffer.from(document.bytes), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${asciiName(document.name)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
