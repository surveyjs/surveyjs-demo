/**
 * Shared, renderer-agnostic types for the schema package.
 *
 * NOTE: This package depends on `survey-core` ONLY. Nothing here may reference
 * a UI framework (survey-react-ui, react-bootstrap, MUI, Tailwind, ...).
 */

/** A SurveyJS V3 survey definition (the JSON you'd pass to `new Model(json)`). */
export type SurveyJSON = Record<string, unknown>;

/** Survey response data keyed by question name. */
export type SurveyData = Record<string, unknown>;

/** Rendering mode for the model factory. */
export type SurveyMode = "edit" | "display";

/** A self-contained, drop-in schema with a stable id + human label. */
export interface SchemaDefinition {
  /** Stable identifier used by routes/nav and the demo registry. */
  readonly id: string;
  /** Human-readable title (mirrors the schema's own `title`). */
  readonly title: string;
  /** Short description for cards / page intros. */
  readonly description: string;
  /** The SurveyJS V3 JSON. Replace freely with your own definition. */
  readonly json: SurveyJSON;
}

/** One stored submission, as a seed writes it: an id plus the survey response data. */
export interface SurveyResult {
  readonly id: string;
  readonly data: SurveyData;
}

/**
 * Where a record's original document lives, as the record links it. Kept by
 * `keepSourceDocument` in `src/storage/documents.ts`; declared here so a
 * collection can name it without depending on storage.
 */
export interface SourceDocument {
  readonly name: string;
  readonly type: string;
  readonly url: string;
  /** When it was read, from `/api/extract`: `YYYY-MM-DDTHH:mm`, UTC. */
  readonly readAt: string;
}

/** Whoever the page is rendered for. `name` is what the switcher shows; the rest is the page's business. */
export interface SessionUser {
  readonly id: string;
  readonly name: string;
  readonly [key: string]: unknown;
}
