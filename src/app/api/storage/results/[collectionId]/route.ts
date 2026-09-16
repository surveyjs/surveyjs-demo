import { NextResponse } from "next/server";
import { recordCollections } from "@/schemas";
import { readAsVisitor } from "@/storage/backend/visitor";

/**
 * A collection's records, as this visitor has them: `GET` → `[{ id, data }]`, in
 * the order they were first stored. No columns: `src/storage/survey-results.ts`
 * derives them with the collection's `toColumns`, and sorts.
 */
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  if (!Object.hasOwn(recordCollections, collectionId)) {
    return NextResponse.json({ error: "Unknown collection." }, { status: 404 });
  }
  return NextResponse.json(
    await readAsVisitor((store, uid) => store.listRecords(uid, collectionId)),
  );
}
