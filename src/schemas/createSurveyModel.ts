import { Model, QuestionMatrixDropdownModelBase } from "survey-core";
import type { SchemaDefinition, SurveyData, SurveyJSON, SurveyMode } from "./types";
// Registers `aiHint` before any model is built, so `model.toJSON()` keeps it.
import "./custom-properties";

export interface CreateSurveyModelOptions {
  /** Initial response data to load into the model. */
  data?: SurveyData;
  /**
   * Values published as survey variables, so the definition can read them with
   * `{name}` — in titles and HTML, in `visibleIf`, and in
   * `defaultValueExpression` to pre-answer a question.
   *
   * This is how a form arrives configured for the person in front of it: the
   * caller passes whatever the session or the CRM already knows, and the JSON
   * decides what to do with it. Set before `data`, because
   * `defaultValueExpression` is evaluated as the questions are created.
   *
   * One variable per field of the signed-in account, each prefixed `user_`
   * (`{user_email}`), so a variable can never be mistaken for a question of the
   * same name. A variable per field, not one object read by path, because that
   * is what SurveyJS variable presets declare: see `variables/index.ts`.
   */
  variables?: Readonly<Record<string, unknown>>;
  /** `edit` (default) for an interactive form, `display` for read-only. */
  mode?: SurveyMode;
  /** Locale code (e.g. "en", "fr"). Defaults to the survey's own locale. */
  locale?: string;
}

/** Accepts either a raw schema JSON or a {@link SchemaDefinition} wrapper. */
export type SchemaInput = SurveyJSON | SchemaDefinition;

/** A wrapper keeps the definition under `json`; a bare definition has no such key. */
function toJson(schema: SchemaInput): SurveyJSON {
  return "json" in schema ? (schema.json as SurveyJSON) : schema;
}

/**
 * The one place a survey model is built.
 *
 * Everything that renders a form in this template comes through here — the admin
 * pages via `SurveyForm`, the embedded demos via `EmbeddedSurvey`, the JSON
 * editor's live preview, even the popup that edits a demo user — so there is a
 * single answer to "how is the model configured?" and no page can drift.
 *
 * It depends on `survey-core` alone and returns a headless model: no React, no
 * survey-react-ui. The same call works under any SurveyJS UI package, which is
 * what makes this file copy-pasteable into an app that is not Next.js.
 *
 * Order matters in the body below, and it is the only subtle thing here:
 *
 *  - variables are published before data is loaded, because
 *    `defaultValueExpression` is evaluated as the questions are created and
 *    would otherwise have nothing to read;
 *  - the mode is set last. survey-core does not run an `expression` question
 *    while the form is read-only, and a matrix builds its rows, running its
 *    cell expressions, only when something first reads them — normally when its
 *    page is shown. So the rows are built here, in edit mode: a record opened
 *    for viewing shows its totals, and one opened for editing does not change
 *    its own data when the viewer reaches the page with the matrix.
 *
 * Row identity is data, not model state: a records page lists the containers
 * whose items carry an `id` (`rowIdContainers`), and storage assigns missing
 * ids on save. Nothing here listens for rows being added.
 */
export function createSurveyModel(
  schema: SchemaInput,
  options: CreateSurveyModelOptions = {},
): Model {
  const { data, variables, mode = "edit", locale } = options;

  const model = new Model(toJson(schema));

  if (variables) {
    for (const [name, value] of Object.entries(variables)) {
      model.setVariable(name, value);
    }
  }

  model.applyTheme({ isPanelless: true });

  if (locale) {
    model.locale = locale;
  }

  if (data) {
    if (variables) {
      // Merge, so the answers a variable already pre-filled survive alongside
      // whatever the caller is loading — replacing would wipe them.
      model.mergeData(data);
    } else {
      // Replace rather than merge so each record loads cleanly.
      model.data = data;
    }
  }

  // Build every matrix's rows while the form is still editable, so their cell
  // expressions, and the totals that read them, have run before anyone looks.
  for (const question of model.getAllQuestions()) {
    if (question instanceof QuestionMatrixDropdownModelBase) {
      void question.visibleRows;
    }
  }

  model.mode = mode;

  return model;
}
