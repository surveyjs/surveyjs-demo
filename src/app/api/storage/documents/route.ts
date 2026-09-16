import { NextResponse } from "next/server";
import { recordCollections } from "@/schemas";
import { MAX_DOCUMENT_BYTES, StorageLimitError, sniffDocumentType } from "@/storage/backend/sqlite";
import { refusal, writeAsVisitor } from "@/storage/backend/visitor";

/**
 * The original a record was read from: `POST` multipart `file` and `collection`
 * → 201 `{ url }`. The URL is the document's own random id under
 * `/api/storage/documents/`, and it is what the record stores.
 *
 * Only PDF, PNG, JPEG and WebP are stored, decided by the bytes. Whoever has
 * the URL can open it, so a file that only claims to be one of those is refused
 * here rather than served later.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send multipart form data." }, { status: 400 });
  }
  const file = body.get("file");
  const collectionId = String(body.get("collection") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No document was uploaded." }, { status: 400 });
  }
  if (!Object.hasOwn(recordCollections, collectionId)) {
    return NextResponse.json({ error: "Unknown collection." }, { status: 404 });
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: new StorageLimitError().message }, { status: 413 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffDocumentType(bytes)) {
    return NextResponse.json(
      { error: "Only PDF, PNG, JPEG and WebP documents are stored." },
      { status: 415 },
    );
  }

  try {
    const docId = await writeAsVisitor((store, uid) =>
      store.putDocument(uid, collectionId, file.name || "document", bytes),
    );
    return NextResponse.json({ url: `/api/storage/documents/${docId}` }, { status: 201 });
  } catch (failure) {
    return refusal(failure);
  }
}
