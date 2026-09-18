import { NextResponse } from "next/server";
import { schemaRegistry, type SurveyData } from "@/schemas";
import { MAX_DOCUMENT_BYTES } from "@/storage/backend/sqlite";
import { definitionFor } from "@/storage/backend/visitor";
import { takeFromDocument } from "./take-from-document";

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
 * With neither set the route answers 501 and the buttons on `/work-orders` say so —
 * the feature is wired, and it starts working the moment a key appears.
 *
 * The definition is **the visitor's own** (`definitionFor`), the same one the
 * record route will check the answers against. That is the whole point of having
 * one function for it: a visitor who edited a choice list gets a document read
 * with their list, and what comes back is storable by construction. Reading the
 * shipped definition here and the visitor's there would throw away legitimate
 * answers at extraction, or hand back a draft the `PUT` then refuses.
 *
 * A model is not a client of this application and cannot be trusted to answer
 * within the form: what it returns goes through the same shape check the write
 * routes use, and anything that does not fit is dropped and **named** in
 * `rejected`. One off-list value then costs one field, not the whole reading.
 */
export const runtime = "nodejs";

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
  // Uploads are read into memory, so the document is kept small: the same 8 MB
  // storage keeps an original up to, one constant for both.
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      { error: "That document is larger than 8 MB." },
      { status: 413 },
    );
  }

  if (!Object.hasOwn(schemaRegistry, formId)) {
    return NextResponse.json({ error: `Unknown form "${formId}".` }, { status: 400 });
  }
  // The visitor's own, so the extractor's prompt, its `aiHint`s and its choice
  // lists are the ones their page renders.
  const formDefinition = await definitionFor(formId);

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

    // `readAt` is this server's clock when the reading succeeded, in UTC to the
    // minute (`YYYY-MM-DDTHH:mm`): a record stores when it was read, and the
    // browser never makes that time up. `confidence` is per field, which is
    // what makes a review step honest: the page can mark what the model was
    // unsure about (nothing reads it yet).
    const readAt = new Date().toISOString().slice(0, 16);
    const { data, rejected } = takeFromDocument(formDefinition, result.data as SurveyData);
    return NextResponse.json({ data, rejected, confidence: result.confidence, readAt });
  } catch (failure) {
    return NextResponse.json(
      { error: (failure as Error).message || "Extraction failed." },
      { status: 502 },
    );
  }
}
