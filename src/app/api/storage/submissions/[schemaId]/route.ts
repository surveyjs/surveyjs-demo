import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { recordCollections, schemaRegistry } from "@/schemas";
import { asObject, readJsonObject, refusal, writeAsVisitor } from "@/storage/backend/visitor";

/**
 * A completed form that no records page owns, `/starter`'s checkout:
 * `POST { data }` → 201 `{ id }`. Stored as a record under the schema id, with a
 * random record id. Nothing reads submissions back; the thank-you screen is the
 * whole story in the page.
 *
 * A form whose id is a collection's is refused: its answers are that
 * collection's records, written through `/api/storage/results`, and a
 * submission stored under the same id would turn up in the list.
 */
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ schemaId: string }> }) {
  const { schemaId } = await context.params;
  if (!Object.hasOwn(schemaRegistry, schemaId)) {
    return NextResponse.json({ error: "Unknown form." }, { status: 404 });
  }
  if (Object.hasOwn(recordCollections, schemaId)) {
    return NextResponse.json(
      { error: "This form's answers are records: save them through /api/storage/results." },
      { status: 409 },
    );
  }
  const data = asObject((await readJsonObject(request))?.data);
  if (!data) {
    return NextResponse.json({ error: "Send { data } with a JSON object." }, { status: 400 });
  }
  const id = randomUUID();
  try {
    await writeAsVisitor((store, uid) => store.putRecord(uid, schemaId, id, data));
  } catch (failure) {
    return refusal(failure);
  }
  return NextResponse.json({ id }, { status: 201 });
}
