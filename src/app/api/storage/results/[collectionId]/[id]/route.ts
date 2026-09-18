import { NextResponse } from "next/server";
import { assignRowIds, recordCollections, toVariables } from "@/schemas";
import { checkResponse } from "@/lib/checks/check-response";
import { NOT_STORED, refusalMessage } from "@/lib/checks/messages";
import { listSessionUsers } from "@/storage/session";
import { assertWithinValueLimit } from "@/storage/backend/sqlite";
import {
  asObject,
  definitionFor,
  readAsVisitor,
  readJsonObject,
  requireVisitor,
  refusal,
  writeAsVisitor,
} from "@/storage/backend/visitor";

/**
 * One record: `GET` → `{ id, data }` or 404, `PUT { data, userId? }` → `{ id, data }`
 * as stored, `DELETE`. Row ids are assigned here, on write, which is the one
 * place every client of a record agrees on.
 *
 * **`PUT` checks the answers against the definition they answer.** The browser
 * validated them already, and that is exactly why this does it again: the form
 * is one client of this endpoint, not its gatekeeper, and a request that never
 * went through the form must meet the same rules as one that did. The rules are
 * the definition's own — the same `visibleIf`, `requiredIf` and validators the
 * page ran — so there is no second rulebook to keep in step.
 *
 * It is **the visitor's own definition** that decides (`definitionFor`), because
 * that is what their page rendered. A visitor who added a choice on `/configure`
 * can answer with it; against the definition that ships they could not.
 *
 * A record the collection calls a draft is checked for shape and not for
 * completeness: a work order read off a scanned job sheet is a draft until a
 * technician has been through it, and refusing to store it would lose the reading.
 *
 * Refused: 422 `{ error, check: "response", first, count }`, and nothing is
 * written — no record, and no visitor row for a visitor who had none.
 */
export const runtime = "nodejs";

type Context = { params: Promise<{ collectionId: string; id: string }> };

async function target(context: Context) {
  const { collectionId, id } = await context.params;
  const collection = Object.hasOwn(recordCollections, collectionId)
    ? recordCollections[collectionId]
    : undefined;
  return collection && id.length > 0 && id.length <= 200 ? { collection, id } : null;
}

const notFound = () => NextResponse.json({ error: "Unknown record." }, { status: 404 });

export async function GET(_request: Request, context: Context) {
  const found = await target(context);
  if (!found) return notFound();
  const record = await readAsVisitor((store, uid) =>
    store.getRecord(uid, found.collection.id, found.id),
  );
  return record ? NextResponse.json(record) : notFound();
}

export async function PUT(request: Request, context: Context) {
  const found = await target(context);
  if (!found) return notFound();
  const body = await readJsonObject(request);
  const data = asObject(body?.data);
  if (!data) {
    return NextResponse.json({ error: "Send { data } with a JSON object." }, { status: 400 });
  }
  const { collection, id } = found;

  // The size cap first, so an oversized body is a 413 that no check ever ran on.
  // `serialize()` in the backend measures again; this only gets the order right.
  try {
    assertWithinValueLimit(data);
  } catch (failure) {
    return refusal(failure);
  }

  // Without a cookie there is nobody to keep anything for, and that is a 403
  // rather than a verdict on the answers: a browser that blocks cookies gets the
  // read-only message, not a lecture about its data.
  try {
    await requireVisitor();
  } catch (failure) {
    return refusal(failure);
  }

  // Who the page is rendered for. The **id** travels and the values do not: a
  // client that could send its own `{user_role}` could answer its way past the
  // rule that reads it. In your app this line is `getSession()` and the body says
  // nothing about who is asking.
  const users = await listSessionUsers(collection.id);
  let variables: Record<string, unknown> | undefined;
  if (users.length > 0) {
    const asked = body?.userId;
    const user = asked === undefined ? users[0] : users.find((candidate) => candidate.id === asked);
    if (!user) return NextResponse.json({ error: "Unknown user." }, { status: 400 });
    variables = toVariables(user);
  }

  // Row ids first, so the check sees exactly what would be stored.
  const document = collection.rowIdContainers
    ? assignRowIds(data, collection.rowIdContainers)
    : data;

  // Read before the write transaction; `writeAsVisitor` stays synchronous inside.
  const definition = await definitionFor(collection.schemaId);
  const verdict = await checkResponse(definition, document, {
    variables,
    requireComplete: !collection.isDraft?.(document),
  });
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

  try {
    await writeAsVisitor((store, uid) => store.putRecord(uid, collection.id, id, document));
  } catch (failure) {
    return refusal(failure);
  }
  return NextResponse.json({ id, data: document });
}

export async function DELETE(_request: Request, context: Context) {
  const found = await target(context);
  if (!found) return notFound();
  try {
    await writeAsVisitor((store, uid) => store.deleteRecord(uid, found.collection.id, found.id));
  } catch (failure) {
    return refusal(failure);
  }
  return new NextResponse(null, { status: 204 });
}
