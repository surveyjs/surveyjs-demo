import { NextResponse } from "next/server";
import { schemaRegistry, type SurveyJSON } from "@/schemas";
import { checkDefinition } from "@/lib/checks/check-definition";
import { NOT_SAVED, refusalMessage } from "@/lib/checks/messages";
import { assertWithinValueLimit } from "@/storage/backend/sqlite";
import {
  asObject,
  readAsVisitor,
  readJsonObject,
  requireVisitor,
  refusal,
  writeAsVisitor,
} from "@/storage/backend/visitor";

/**
 * One form's definition, as this visitor has it: `GET` → `{ json }`, `PUT { json }`,
 * and `DELETE`, the editor's Reset, which puts back the definition that ships.
 *
 * **`PUT` lints the definition and runs its tests**, in that order, and stores
 * nothing that fails either. The rules are the ones the author saw while they
 * were typing — one `lintSurveyJson`, the same template suppressions, the form's
 * own variable presets — so a broken expression the editor flagged is the one
 * this rejects, and a client that skipped the editor gets no easier rule.
 *
 * Only an `error` finding blocks. An author who has just added an empty panel
 * has not broken the form, and `page/empty` is a warning; `/api/lint` keeps its
 * stricter `ok`, because it advises and this decides.
 *
 * Survey Creator autosaves in the full edition, and this handler refuses some of
 * those saves on purpose. Nothing is lost by it: the editor keeps the author's
 * work, the definition on the server stays the last good one, and the next clean
 * autosave stores it. The Creator's condition editor never commits an expression
 * it cannot parse, so in practice only the JSON tab produces such a save.
 *
 * `DELETE` is not checked: it restores a definition that ships, and
 * `e2e/server-checks.spec.ts` proves every one of those clean.
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

  // By cost: an oversized definition is a 413 that was never linted.
  try {
    assertWithinValueLimit(json);
  } catch (failure) {
    return refusal(failure);
  }

  // A write without a valid cookie is a 403, before any check has an opinion.
  try {
    await requireVisitor();
  } catch (failure) {
    return refusal(failure);
  }

  const verdict = await checkDefinition(schemaId, json as SurveyJSON);
  if (!verdict.ok && verdict.first) {
    return NextResponse.json(
      {
        error: refusalMessage(NOT_SAVED, verdict.first, verdict.count),
        check: verdict.check,
        first: verdict.first,
        count: verdict.count,
      },
      { status: 422 },
    );
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
