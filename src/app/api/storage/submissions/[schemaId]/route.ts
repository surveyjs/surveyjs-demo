import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { recordCollections, schemaRegistry } from "@/schemas";
import { checkResponse } from "@/lib/checks/check-response";
import { NOT_STORED, refusalMessage } from "@/lib/checks/messages";
import { assertWithinValueLimit } from "@/storage/backend/sqlite";
import {
  asObject,
  definitionFor,
  readJsonObject,
  requireVisitor,
  refusal,
  writeAsVisitor,
} from "@/storage/backend/visitor";

/**
 * A completed form that no records page owns, `/starter`'s checkout:
 * `POST { data }` → 201 `{ id }`. Stored as a record under the schema id, with a
 * random record id. Nothing reads submissions back; the thank-you screen is the
 * whole story in the page.
 *
 * **The answers are checked against the definition they answer**, with the same
 * headless survey-core model the page used. The browser validated them, and that
 * is why this validates them again: the form is one client of this endpoint, not
 * its gatekeeper, and a `curl` that skipped the form gets no easier rule. The
 * definition is **the visitor's own** (`definitionFor`), because that is what
 * their page rendered. A refusal is 422, and nothing is written.
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

  // The size cap first: an oversized body is a 413 that no check ever ran on.
  try {
    assertWithinValueLimit(data);
  } catch (failure) {
    return refusal(failure);
  }

  // A write without a valid cookie is a 403, before any check has an opinion.
  try {
    await requireVisitor();
  } catch (failure) {
    return refusal(failure);
  }

  const definition = await definitionFor(schemaId);
  const verdict = await checkResponse(definition, data);
  if (!verdict.ok && verdict.first) {
    return NextResponse.json(
      {
        error: refusalMessage(
          NOT_STORED,
          { message: verdict.first.message, where: verdict.first.path || undefined },
          verdict.count,
        ),
        check: "response",
        first: verdict.first,
        count: verdict.count,
      },
      { status: 422 },
    );
  }

  const id = randomUUID();
  try {
    await writeAsVisitor((store, uid) => store.putRecord(uid, schemaId, id, data));
  } catch (failure) {
    return refusal(failure);
  }
  return NextResponse.json({ id }, { status: 201 });
}
