import { NextResponse } from "next/server";
import { getSchemaDefinition } from "@/schemas";

/**
 * Extract answers from a scanned form, a photo or a PDF.
 *
 * The other half of "a form is a JSON document": the same definition that draws
 * the web form tells an LLM what to look for in a paper one. SurveyJS ships the
 * plumbing as an MIT plugin — [ai-form-response-extractor] — and it takes the
 * document plus our schema and returns an object keyed by question name, which
 * the browser then merges into the model for a human to check and correct.
 *
 * This runs on the server for one reason: the API key. It never reaches the
 * client, which is also why the provider is chosen here rather than passed in.
 *
 * Configure it with one of these, and nothing else:
 *
 *   OPENAI_API_KEY=…       # then EXTRACTOR_MODEL defaults to gpt-4o
 *   ANTHROPIC_API_KEY=…    # then EXTRACTOR_MODEL defaults to claude-sonnet-5
 *
 * With neither set the route answers 501 and the button on `/claims` says so —
 * the feature is wired, and it starts working the moment a key appears.
 */
export const runtime = "nodejs";

/** Uploads are read into memory, so keep the accepted document small. */
const MAX_BYTES = 8 * 1024 * 1024;

async function pickProvider() {
  const { openai, anthropic } = await import("ai-form-response-extractor/providers");
  const model = process.env.EXTRACTOR_MODEL;

  if (process.env.OPENAI_API_KEY) return openai(model ?? "gpt-4o");
  if (process.env.ANTHROPIC_API_KEY) return anthropic(model ?? "claude-sonnet-5");
  return null;
}

export async function POST(request: Request) {
  const body = await request.formData();
  const file = body.get("file");
  const formId = String(body.get("formId") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No document was uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That document is larger than 8 MB." },
      { status: 413 },
    );
  }

  let formDefinition;
  try {
    formDefinition = getSchemaDefinition(formId).json;
  } catch {
    return NextResponse.json({ error: `Unknown form "${formId}".` }, { status: 400 });
  }

  const provider = await pickProvider();
  if (!provider) {
    return NextResponse.json(
      {
        code: "no-key",
        error:
          "Extraction needs an LLM key: set OPENAI_API_KEY or ANTHROPIC_API_KEY and restart.",
      },
      { status: 501 },
    );
  }

  try {
    const { createExtractor } = await import("ai-form-response-extractor");
    const extractor = createExtractor({ provider, adapter: "surveyjs" });

    const result = await extractor.extractFromImage({
      image: Buffer.from(await file.arrayBuffer()),
      formDefinition,
    });

    // `confidence` is per field, which is what makes a review step honest: the
    // page can mark what the model was unsure about.
    return NextResponse.json({ data: result.data, confidence: result.confidence });
  } catch (failure) {
    return NextResponse.json(
      { error: (failure as Error).message || "Extraction failed." },
      { status: 502 },
    );
  }
}
