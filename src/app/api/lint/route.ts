import { NextResponse } from "next/server";
import { lintSurveyJson } from "@/lib/lint/lint-survey";

/**
 * A definition that arrives from a client is checked with the rules its author saw.
 *
 * This handler is byte-for-byte identical in both editions: the MIT edition draws the
 * findings over Monaco, the full edition inside Survey Creator, and both send the
 * definition here. `lintSurveyJson` is the function the editor's status bar calls, with
 * the same rules and the same template suppressions. So a broken expression the editor
 * flagged is the one this rejects, and a client that skipped the editor, or edited the
 * payload on the way, gets no easier rule.
 *
 * POST { json } → 200 { ok, findings }. Call it before storing a definition; see
 * `src/storage/survey-json.ts`.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const json = (body as { json?: unknown } | null)?.json;

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return NextResponse.json(
      { error: "Expected a body of the form { json }, with a survey definition object." },
      { status: 400 },
    );
  }

  const { ok, findings } = lintSurveyJson(json as Record<string, unknown>);
  return NextResponse.json({ ok, findings });
}
