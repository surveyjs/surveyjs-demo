import type { SourceDocument } from "@/schemas";
import { beforeWrite, storageError } from "./access";

export type { SourceDocument };

/**
 * One of the seams between this template and your storage: the original
 * documents records are read from. Its siblings are `survey-json.ts`, the
 * definitions, `survey-results.ts`, the answers, and `session.ts`, the
 * signed-in user.
 *
 * A record read from a document links its original, so a reviewer can check the
 * answers against it and the signature stays on the paper it was made on.
 *
 * A sample that ships in `public/samples` already has a public URL, and keeps
 * it. A visitor's upload is stored in their sandbox, beside the record it was
 * read from, through `/api/storage/documents`, and the record links the URL that
 * route answers. In your app, upload the file to object storage and return its
 * durable URL:
 *
 *   export async function keepSourceDocument(file, readAt) {
 *     if (!(file instanceof File)) return { ...file, readAt };
 *     const body = new FormData();
 *     body.set("file", file);
 *     const res = await fetch("/api/documents", { method: "POST", body });
 *     const { url } = await res.json(); // e.g. a signed object-storage URL
 *     return { name: file.name, type: file.type, url, readAt };
 *   }
 *
 * The document is stored the moment its reading succeeds, before the record
 * exists. A reading whose record is never created leaves an orphan, which Reset
 * demo data or the idle-visitor cleanup removes.
 */

/**
 * Keep the document a record was read from, and return the link the record stores.
 * `collectionId` is the collection the record will belong to.
 */
export async function keepSourceDocument(
  file: File | { url: string; name: string; type: string },
  readAt: string,
  collectionId: string,
): Promise<SourceDocument> {
  if (!(file instanceof File)) {
    return { name: file.name, type: file.type, url: file.url, readAt };
  }
  await beforeWrite();
  const body = new FormData();
  body.set("file", file);
  body.set("collection", collectionId);
  const res = await fetch("/api/storage/documents", { method: "POST", body });
  if (!res.ok) throw await storageError(res, "POST /api/storage/documents");
  const { url } = (await res.json()) as { url: string };
  return { name: file.name, type: file.type, url, readAt };
}
