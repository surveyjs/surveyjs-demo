import { NextResponse } from "next/server";
import { schemaRegistry, type SurveyJSON } from "@/schemas";
import {
  asObject,
  readAsVisitor,
  readJsonObject,
  refusal,
  writeAsVisitor,
} from "@/storage/backend/visitor";

/**
 * One form's definition, as this visitor has it: `GET` → `{ json }`, `PUT { json }`,
 * and `DELETE`, the editor's Reset, which puts back the definition that ships.
 *
 * `PUT` does not lint. Survey Creator autosaves in the full edition, a
 * half-typed expression would fail every one of those saves, and the sandbox is
 * the visitor's own. A real API lints here; `src/storage/survey-json.ts` shows how.
 */
export const runtime = "nodejs";

type Context = { params: Promise<{ schemaId: string }> };

async function known(context: Context): Promise<string | null> {
  const { schemaId } = await context.params;
  return Object.hasOwn(schemaRegistry, schemaId) ? schemaId : null;
}

const notFound = () => NextResponse.json({ error: "Unknown form." }, { status: 404 });

export async function GET(_request: Request, context: Context) {
  const schemaId = await known(context);
  if (!schemaId) return notFound();
  const json = await readAsVisitor((store, uid) => store.getDefinition(uid, schemaId));
  return NextResponse.json({ json: json ?? schemaRegistry[schemaId].json });
}

export async function PUT(request: Request, context: Context) {
  const schemaId = await known(context);
  if (!schemaId) return notFound();
  const json = asObject((await readJsonObject(request))?.json);
  if (!json) {
    return NextResponse.json({ error: "Send { json } with a JSON object." }, { status: 400 });
  }
  try {
    await writeAsVisitor((store, uid) => store.putDefinition(uid, schemaId, json as SurveyJSON));
  } catch (failure) {
    return refusal(failure);
  }
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_request: Request, context: Context) {
  const schemaId = await known(context);
  if (!schemaId) return notFound();
  try {
    await writeAsVisitor((store, uid) => store.copyTemplateDefinition(uid, schemaId));
  } catch (failure) {
    return refusal(failure);
  }
  return new NextResponse(null, { status: 204 });
}
