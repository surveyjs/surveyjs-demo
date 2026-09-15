import type { SourceDocument } from "@/schemas";

export type { SourceDocument };

/**
 * One of the four seams between this template and your storage: the original
 * documents records are read from. Its siblings are `survey-json.ts`, the
 * definitions, `survey-results.ts`, the answers, and `session.ts`, the
 * signed-in user.
 *
 * A record read from a document links its original, so a reviewer can check the
 * answers against it and the signature stays on the paper it was made on.
 *
 * Nothing is uploaded here, on purpose. A sample that ships in `public/samples`
 * already has a public URL, and keeps it. A visitor's upload gets an object URL:
 * it lives in this browser tab until the page is reloaded, which is exactly as
 * long as the in-memory record that links it (see `survey-results.ts`), so
 * nothing claims to persist that does not. In your app, upload the file to object
 * storage and return its durable URL:
 *
 *   export async function keepSourceDocument(file, readAt) {
 *     if (!(file instanceof File)) return { ...file, readAt };
 *     const body = new FormData();
 *     body.set("file", file);
 *     const res = await fetch("/api/documents", { method: "POST", body });
 *     const { url } = await res.json(); // e.g. a signed object-storage URL
 *     return { name: file.name, type: file.type, url, readAt };
 *   }
 */

/**
 * Keep the document a record was read from, and return the link the record stores.
 * In your app: upload it to object storage and return a durable URL.
 */
export async function keepSourceDocument(
  file: File | { url: string; name: string; type: string },
  readAt: string,
): Promise<SourceDocument> {
  if (file instanceof File) {
    return { name: file.name, type: file.type, url: URL.createObjectURL(file), readAt };
  }
  return { name: file.name, type: file.type, url: file.url, readAt };
}
