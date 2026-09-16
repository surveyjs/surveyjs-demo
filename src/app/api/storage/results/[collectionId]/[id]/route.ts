import { NextResponse } from "next/server";
import { assignRowIds, recordCollections } from "@/schemas";
import {
  asObject,
  readAsVisitor,
  readJsonObject,
  refusal,
  writeAsVisitor,
} from "@/storage/backend/visitor";

/**
 * One record: `GET` → `{ id, data }` or 404, `PUT { data }` → `{ id, data }` as
 * stored, `DELETE`. Row ids are assigned here, on write, which is the one place
 * every client of a record agrees on.
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
  const data = asObject((await readJsonObject(request))?.data);
  if (!data) {
    return NextResponse.json({ error: "Send { data } with a JSON object." }, { status: 400 });
  }
  const { collection, id } = found;
  const document = collection.rowIdContainers
    ? assignRowIds(data, collection.rowIdContainers)
    : data;
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
