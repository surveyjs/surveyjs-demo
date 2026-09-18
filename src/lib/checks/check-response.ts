import {
  Model,
  QuestionBooleanModel,
  QuestionCheckboxModel,
  QuestionExpressionModel,
  QuestionFileModel,
  QuestionImagePickerModel,
  QuestionMatrixDropdownModel,
  QuestionMatrixDropdownModelBase,
  QuestionMatrixDynamicModel,
  QuestionMatrixModel,
  QuestionMultipleTextModel,
  QuestionPanelDynamicModel,
  QuestionSelectBase,
  QuestionSignaturePadModel,
  QuestionTextBase,
  type Question,
} from "survey-core";
import { createSurveyModel } from "@/schemas/createSurveyModel";
import type { SurveyData, SurveyJSON } from "@/schemas/types";

/**
 * Does a response fit the definition it answers?
 *
 * The browser asked this already. That is exactly why the server asks it again:
 * a client that skipped the form, or edited the payload on the way, gets no
 * easier rule than the person who filled the form in.
 *
 * There are two questions, and only the second one needs a live model:
 *
 *  1. **Shape** — has every value the JSON type and the container shape its
 *     question stores? A walk of the *raw payload*, before any model sees it.
 *     It has to be the payload and not `model.data`: assigning data to a model
 *     can coerce, recompute or rebuild a value (a `ranking` given an unknown
 *     choice comes back as a full ranking nobody gave), so a model is not a
 *     faithful witness of what arrived. It also has to come first, because
 *     `clearIncorrectValues` throws a `TypeError` on a dynamic matrix whose rows
 *     are not objects — the method meant to make untrusted data safe is the one
 *     a crafted request turns into a 500.
 *  2. **Completeness** — `validate` on a model built exactly as the page builds
 *     it, so the same `visibleIf`, `requiredIf` and validators run, with the
 *     same variables, matrix rows and calculated values.
 *
 * What survey-core does and does not check for itself is written up in
 * `prompts/server-checks-survey-core-bugs.md`. Nothing here waits for those
 * fixes; when they land, layer one becomes a second opinion rather than the
 * only one.
 *
 * survey-core only: no React, no Next.js. A route, a script and a spec all call it.
 */

/** One value that does not fit, named where it is. */
export interface Rejection {
  /** Precise down to the cell: `lineItems[2].quantity`, `satisfaction.row1`. */
  readonly path: string;
  /** The top-level question the value belongs to. */
  readonly name: string;
  readonly message: string;
}

export interface SanitizeResult {
  /** A new object with every value that does not fit removed. The input is never touched. */
  readonly data: SurveyData;
  /** All of them, in document order. */
  readonly rejections: readonly Rejection[];
}

/** The first thing wrong with a response, whichever layer found it. */
export interface ResponseFailure {
  readonly kind: "shape" | "validation";
  readonly path: string;
  readonly name: string;
  readonly title?: string;
  readonly message: string;
}

export interface CheckResponseResult {
  readonly ok: boolean;
  readonly first?: ResponseFailure;
  /** How many things were wrong, so the message can say "3 more". */
  readonly count: number;
}

export interface SanitizeOptions {
  /** The session user's values, as the page publishes them. Never the client's. */
  readonly variables?: Readonly<Record<string, unknown>>;
}

export interface CheckResponseOptions extends SanitizeOptions {
  /** `false` for a draft: shape is still checked, completeness is not. */
  readonly requireComplete?: boolean;
  /** How long an asynchronous validator may take before the answer is "no". */
  readonly timeoutMs?: number;
}

/** A validator that calls an async function gets this long, and then the write is refused. */
export const DEFAULT_VALIDATION_TIMEOUT_MS = 5_000;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isScalar = (value: unknown): boolean =>
  value === null || ["string", "number", "boolean"].includes(typeof value);

/**
 * What kind of JSON value a question's answer may be.
 *
 * Keyed on the model classes rather than on type names, so a question type
 * derived from one of them is classified with its base. `unknown` is the honest
 * answer for a type this table has not been taught, and it refuses nothing:
 * a template that adds a question type gets a check that says "I do not know",
 * never one that throws away a legitimate answer.
 */
type ValueShape =
  | "scalar"
  | "scalarArray"
  | "scalarObject"
  | "rowArray"
  | "rowObject"
  | "fileList"
  | "unknown";

export function shapeOf(question: Question): ValueShape {
  // A dynamic matrix and a dynamic panel both store a list of rows.
  if (question instanceof QuestionMatrixDynamicModel) return "rowArray";
  if (question instanceof QuestionPanelDynamicModel) return "rowArray";
  // A dropdown matrix stores one row object per declared row.
  if (question instanceof QuestionMatrixDropdownModel) return "rowObject";
  // A plain matrix and a multiple-text store one scalar per declared row or item.
  if (question instanceof QuestionMatrixModel) return "scalarObject";
  if (question instanceof QuestionMultipleTextModel) return "scalarObject";
  // checkbox, tagbox and ranking all derive from the checkbox model.
  if (question instanceof QuestionCheckboxModel) return "scalarArray";
  if (question instanceof QuestionImagePickerModel) {
    return question.multiSelect ? "scalarArray" : "scalar";
  }
  // A signature is a data URL; a file question is a list of file entries.
  if (question instanceof QuestionSignaturePadModel) return "scalar";
  if (question instanceof QuestionFileModel) return "fileList";
  if (question instanceof QuestionExpressionModel) return "scalar";
  if (question instanceof QuestionSelectBase) return "scalar";
  if (question instanceof QuestionTextBase) return "scalar";
  if (question instanceof QuestionBooleanModel) return "scalar";
  // rating and slider carry a number and derive from Question directly.
  if (["rating", "slider"].includes(question.getType())) return "scalar";
  return "unknown";
}

/** The keys a stored file entry may carry. `content` is the URL or data URL. */
const FILE_ENTRY_KEYS = new Set(["name", "type", "content", "size", "id"]);

/** How `value` fails `shape`, or `null` when it fits. */
function misfit(shape: ValueShape, value: unknown): string | null {
  switch (shape) {
    case "scalar":
      return isScalar(value) ? null : "takes one value, not a list or an object";
    case "scalarArray":
      if (!Array.isArray(value)) return "takes a list of values";
      return value.every(isScalar) ? null : "takes a list of single values";
    case "rowArray":
      if (!Array.isArray(value)) return "takes a list of rows";
      return value.every(isPlainObject) ? null : "takes a list of rows, and one of them is not";
    case "rowObject":
      if (!isPlainObject(value)) return "takes one row per row of the matrix";
      return Object.values(value).every(isPlainObject)
        ? null
        : "takes one row per row of the matrix, and one of them is not";
    case "scalarObject":
      if (!isPlainObject(value)) return "takes one value per field";
      return Object.values(value).every(isScalar)
        ? null
        : "takes one value per field, and one of them is a list or an object";
    case "fileList": {
      const entries = Array.isArray(value) ? value : [value];
      if (!entries.every(isPlainObject)) return "takes a list of files";
      return entries.every((entry) =>
        Object.keys(entry as Record<string, unknown>).every((key) => FILE_ENTRY_KEYS.has(key)),
      )
        ? null
        : "takes a list of files, and one entry is not one";
    }
    default:
      // A type this table does not know. Report it nowhere and refuse nothing.
      return null;
  }
}

/**
 * The questions a row of this container may hold, by the key they are stored
 * under. A row is not only its columns: a dropdown or dynamic matrix can carry
 * an expandable detail panel, and those questions live in the same row object
 * (encounter-note does this three times).
 */
function rowQuestions(question: Question): Map<string, Question> | null {
  if (question instanceof QuestionMatrixDropdownModelBase) {
    const found = new Map<string, Question>();
    for (const column of question.columns) found.set(column.name, column.templateQuestion);
    for (const nested of question.detailPanel?.questions ?? []) {
      found.set(nested.getValueName(), nested);
    }
    return found;
  }
  if (question instanceof QuestionPanelDynamicModel) {
    const found = new Map<string, Question>();
    for (const nested of question.template.questions) found.set(nested.getValueName(), nested);
    return found;
  }
  return null;
}

/** The field names a plain matrix or a multiple-text may be keyed by. */
function scalarKeys(question: Question): Set<string> | null {
  if (question instanceof QuestionMatrixModel) {
    return new Set(question.rows.map((row) => String(row.value)));
  }
  if (question instanceof QuestionMultipleTextModel) {
    return new Set(question.items.map((item) => item.name));
  }
  return null;
}

/** A value survey-core computes for itself, so a client's copy of it is never the client's fault. */
function isComputed(question: Question): boolean {
  return question instanceof QuestionExpressionModel;
}

/** How deep a container may nest before the walk stops describing and starts looping. */
const MAX_DEPTH = 8;

/**
 * Where a value sits, as steps rather than as text. The `path` a caller reads is
 * built from these; the cleaner walks them. Reading a path back out of its own
 * string would work until a question is named `a.b`.
 */
type Step = string | number;

/** A rejection with the route back to the value, so exactly that value can be dropped. */
interface Placed extends Rejection {
  readonly steps: readonly Step[];
}

/** The route back to the value is the walk's own business; a caller gets the path. */
function published(rejections: readonly Placed[]): Rejection[] {
  return rejections.map(({ path, name, message }) => ({ path, name, message }));
}

/** `lineItems[2].quantity`, from `["lineItems", 2, "quantity"]`. */
function pathOf(steps: readonly Step[]): string {
  return steps.reduce<string>(
    (text, step) =>
      typeof step === "number" ? `${text}[${step}]` : text === "" ? step : `${text}.${step}`,
    "",
  );
}

function reject(
  rejections: Placed[],
  steps: readonly Step[],
  name: string,
  message: string,
): void {
  rejections.push({ path: pathOf(steps), name, steps, message });
}

/**
 * A copy of `data` without exactly the values named, and nothing else.
 *
 * Applied deepest and last-listed first, because the rejections were collected
 * in document order: reversing them means an array's own indices come down from
 * the top, so removing one never moves the next.
 */
function without(data: SurveyData, rejections: readonly Placed[]): SurveyData {
  const copy = structuredClone(data) as Record<string, unknown>;
  for (const rejection of [...rejections].reverse()) {
    const steps = rejection.steps;
    let holder: unknown = copy;
    for (let index = 0; index < steps.length - 1 && holder !== undefined; index++) {
      const step = steps[index];
      holder =
        typeof step === "number"
          ? Array.isArray(holder)
            ? holder[step]
            : undefined
          : isPlainObject(holder)
            ? holder[step]
            : undefined;
    }
    const last = steps[steps.length - 1];
    if (typeof last === "number" && Array.isArray(holder)) holder.splice(last, 1);
    else if (typeof last === "string" && isPlainObject(holder)) delete holder[last];
  }
  return copy;
}

function checkRow(
  question: Question,
  row: Record<string, unknown>,
  steps: readonly Step[],
  name: string,
  rejections: Placed[],
  depth: number,
): void {
  const known = rowQuestions(question);
  if (!known) return;
  for (const [key, value] of Object.entries(row)) {
    const nested = known.get(key);
    if (!nested) {
      reject(rejections, [...steps, key], name, `"${key}" is not a field of this row`);
      continue;
    }
    checkValue(nested, value, [...steps, key], name, rejections, depth + 1);
  }
}

function checkValue(
  question: Question,
  value: unknown,
  steps: readonly Step[],
  name: string,
  rejections: Placed[],
  depth = 0,
): void {
  if (value === undefined) return;
  const shape = shapeOf(question);
  const failure = misfit(shape, value);
  if (failure) {
    // A malformed container is one rejection at the container's own path, not
    // one per child it does not have.
    reject(rejections, steps, name, `"${question.title || question.name}" ${failure}`);
    return;
  }
  if (depth >= MAX_DEPTH) return;
  if (shape === "rowArray") {
    (value as Record<string, unknown>[]).forEach((row, index) =>
      checkRow(question, row, [...steps, index], name, rejections, depth),
    );
    return;
  }
  if (shape === "rowObject") {
    const rows = new Set((question as QuestionMatrixDropdownModel).rows.map((row) => String(row.value)));
    for (const [key, row] of Object.entries(value as Record<string, unknown>)) {
      if (!rows.has(key)) {
        reject(rejections, [...steps, key], name, `"${key}" is not a row of this matrix`);
        continue;
      }
      checkRow(question, row as Record<string, unknown>, [...steps, key], name, rejections, depth);
    }
    return;
  }
  if (shape === "scalarObject") {
    const keys = scalarKeys(question);
    if (!keys) return;
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (!keys.has(key)) {
        reject(rejections, [...steps, key], name, `"${key}" is not a field of this question`);
      }
    }
  }
}

/**
 * Layer two: what only a live model knows — a choice restricted by
 * `choicesVisibleIf`, a value the model rebuilt on assignment. Everything layer
 * one passed is loaded into a model, `clearIncorrectValues` runs, and whatever
 * came back different is reported at its path.
 *
 * It compares against the payload's own clone, never against `model.data` before
 * and after: loading alone *adds* every `expression` question's value and
 * recomputes the ones a client sent, and a diff of the model against itself
 * would call all of that the client's doing.
 */
function compareAgainstModel(
  question: Question,
  sent: unknown,
  settled: unknown,
  steps: readonly Step[],
  name: string,
  rejections: Placed[],
  depth = 0,
): void {
  if (sent === undefined || isComputed(question)) return;
  // A choice that is not on the list is what this layer is for, so it says so.
  const cannotHold = (what: Question) =>
    what instanceof QuestionSelectBase
      ? `"${what.title || what.name}" has no such choice`
      : `"${what.title || what.name}" cannot hold this value`;

  if (settled === undefined) {
    reject(rejections, steps, name, cannotHold(question));
    return;
  }
  if (depth >= MAX_DEPTH) return;
  const shape = shapeOf(question);
  if (shape === "rowArray" && Array.isArray(sent)) {
    const rows = Array.isArray(settled) ? settled : [];
    (sent as Record<string, unknown>[]).forEach((row, index) => {
      const settledRow = rows[index];
      if (!isPlainObject(settledRow)) {
        reject(rejections, [...steps, index], name, "is not a row this question can hold");
        return;
      }
      compareRow(question, row, settledRow, [...steps, index], name, rejections, depth);
    });
    return;
  }
  if (shape === "rowObject" && isPlainObject(sent)) {
    for (const [key, row] of Object.entries(sent)) {
      const settledRow = isPlainObject(settled) ? settled[key] : undefined;
      if (!isPlainObject(settledRow)) {
        reject(rejections, [...steps, key], name, "is not a row this matrix can hold");
        continue;
      }
      compareRow(question, row as Record<string, unknown>, settledRow, [...steps, key], name, rejections, depth);
    }
    return;
  }
  if (shape === "scalarArray" && Array.isArray(sent)) {
    // Membership, not order: `ranking` rewrites the whole list on assignment, so
    // an item that came back is one the question accepts and an item that did
    // not is one it does not.
    const kept = new Set(Array.isArray(settled) ? settled : []);
    sent.forEach((item, index) => {
      if (!kept.has(item)) {
        reject(rejections, [...steps, index], name, cannotHold(question));
      }
    });
  }
  // A scalar that came back **changed** is not reported. Loading legitimately
  // rewrites one: an input mask normalises a phone number, a number question
  // parses a numeric string. What this layer is looking for is a value the
  // question would not hold at all, and that one comes back `undefined`.
}

function compareRow(
  question: Question,
  sent: Record<string, unknown>,
  settled: Record<string, unknown>,
  steps: readonly Step[],
  name: string,
  rejections: Placed[],
  depth: number,
): void {
  const known = rowQuestions(question);
  if (!known) return;
  for (const [key, value] of Object.entries(sent)) {
    const nested = known.get(key);
    if (!nested) continue; // layer one already refused it
    compareAgainstModel(nested, value, settled[key], [...steps, key], name, rejections, depth + 1);
  }
}

/**
 * Every value of `data` that does not fit `json`, and a copy of `data` without them.
 *
 * `/api/extract` calls this on its own: a reading is dropped field by field and
 * the visitor is told which, rather than the whole document being refused over
 * one off-list value. The write routes call `checkResponse`, which starts here.
 *
 * Nothing else in this template may implement a shape rule.
 */
export function sanitizeResponse(
  json: SurveyJSON,
  data: SurveyData,
  options: SanitizeOptions = {},
): SanitizeResult {
  const structure = new Model(json);
  if (options.variables) {
    for (const [name, value] of Object.entries(options.variables)) {
      structure.setVariable(name, value);
    }
  }

  const byKey = new Map<string, Question>();
  for (const question of structure.getAllQuestions(false, false, false)) {
    byKey.set(question.getValueName(), question);
  }
  // A calculated value with `includeIntoResult` is stored beside the answers and
  // is the survey's own, not a question.
  const calculated = new Set(
    (structure.calculatedValues ?? [])
      .filter((value) => value.includeIntoResult)
      .map((value) => value.name),
  );

  const rejections: Placed[] = [];
  const commentSuffix = "-Comment";

  for (const key of Object.keys(data)) {
    const value = data[key];
    const commented = key.endsWith(commentSuffix) ? key.slice(0, -commentSuffix.length) : null;
    const question = byKey.get(key) ?? (commented ? byKey.get(commented) : undefined);

    if (!question) {
      // A calculated value with `includeIntoResult` is stored beside the answers.
      if (calculated.has(key)) continue;
      reject(rejections, [key], key, `"${key}" is not a question of this form`);
      continue;
    }
    if (commented) {
      if (!isScalar(value)) reject(rejections, [key], commented, "a comment takes one value");
      continue;
    }
    checkValue(question, value, [key], key, rejections);
  }
  structure.dispose();

  // Layer two runs on what layer one left, never on the payload as it arrived:
  // that is the call that throws on a malformed container, and the container is
  // gone by now. So both layers report, and a caller sees everything at once.
  // (When layer one dropped an item out of a list, layer two's paths count the
  // shortened list. It is the only case where a published path is not an index
  // into what was sent, and it costs a rejection nothing.)
  const cleaned = rejections.length === 0 ? data : without(data, rejections);

  const settled = settleInModel(json, cleaned, options.variables);
  if (settled.threw) {
    reject(rejections, [settled.threw], settled.threw, "cannot be loaded into this form");
    return { data: without(cleaned, rejections.slice(-1)), rejections: published(rejections) };
  }

  const second: Placed[] = [];
  for (const [key, value] of Object.entries(cleaned)) {
    const question = byKeyOf(settled.model!, key);
    if (!question) continue; // a calculated value, or a comment: layer one owns those
    compareAgainstModel(question, value, settled.model!.data[key], [key], key, second);
  }
  settled.model?.dispose();

  // Only what does not fit is removed, down to the cell: one bad choice in the
  // third row of a matrix costs that cell, and the other rows are stored.
  return {
    data: second.length === 0 ? structuredClone(cleaned) : without(cleaned, second),
    // Document order, not layer order: each layer walks the payload in order, so
    // merging them by the answer they are about puts a caller's list in the order
    // the answers were sent.
    rejections: published(inDocumentOrder(Object.keys(data), [...rejections, ...second])),
  };
}

/** Stable, by the top-level answer each rejection is about. */
function inDocumentOrder(keys: readonly string[], rejections: readonly Placed[]): Placed[] {
  const place = (rejection: Placed) => {
    const index = keys.indexOf(String(rejection.steps[0]));
    return index === -1 ? keys.length : index;
  };
  return rejections
    .map((rejection, index) => ({ rejection, index }))
    .sort((a, b) => place(a.rejection) - place(b.rejection) || a.index - b.index)
    .map(({ rejection }) => rejection);
}

/** The question a top-level key belongs to, or `undefined` for a comment or a calculated value. */
function byKeyOf(model: Model, key: string): Question | undefined {
  for (const question of model.getAllQuestions(false, false, false)) {
    if (question.getValueName() === key) return question;
  }
  return undefined;
}

/**
 * Load the payload into a model and let it settle. `clearIncorrectValues` is
 * wrapped because on survey-core 3.1.0 it throws for row shapes layer one is
 * meant to have caught: if one ever gets through, that is a rejection at the
 * question's path, never a 500.
 */
function settleInModel(
  json: SurveyJSON,
  data: Record<string, unknown>,
  variables?: Readonly<Record<string, unknown>>,
): { model?: Model; threw?: string } {
  const model = createSurveyModel(json, { data: structuredClone(data), variables });
  try {
    model.clearIncorrectValues(true);
  } catch {
    model.dispose();
    // The method gave no path, so the payload is narrowed one key at a time.
    for (const key of Object.keys(data)) {
      const alone = createSurveyModel(json, { data: structuredClone({ [key]: data[key] }), variables });
      try {
        alone.clearIncorrectValues(true);
        alone.dispose();
      } catch {
        alone.dispose();
        return { threw: key };
      }
    }
    return { threw: Object.keys(data)[0] ?? "" };
  }
  return { model };
}

/**
 * Is this response storable under this definition?
 *
 * Shape first, because it is cheap and because a malformed container must never
 * reach a model. Only a payload with nothing wrong goes on to completeness.
 *
 * **It is asynchronous because validation can be.** A definition whose page a
 * visitor can render must be one their answers can be stored under, so a
 * validator that calls an async function is awaited rather than refused. The
 * wait has a deadline, and an unresolved verdict never permits a write: past it
 * the answer is "no", and the route says so like any other refusal. survey-core
 * calls the callback only when the function answers — one that never does would
 * otherwise hold the request open for ever.
 */
export async function checkResponse(
  json: SurveyJSON,
  data: SurveyData,
  options: CheckResponseOptions = {},
): Promise<CheckResponseResult> {
  const { rejections } = sanitizeResponse(json, data, options);
  if (rejections.length > 0) {
    const [first] = rejections;
    return {
      ok: false,
      count: rejections.length,
      first: { kind: "shape", path: first.path, name: first.name, message: first.message },
    };
  }

  if (options.requireComplete === false) return { ok: true, count: 0 };

  const timeoutMs = options.timeoutMs ?? DEFAULT_VALIDATION_TIMEOUT_MS;
  // Built the way the page builds it, so variables, matrix rows and calculated
  // values settle exactly as they did on screen.
  const model = createSurveyModel(json, { data, variables: options.variables });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const verdict = await new Promise<"valid" | "invalid" | "timeout">((resolve) => {
      let settled = false;
      const answer = (value: "valid" | "invalid" | "timeout") => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      timer = setTimeout(() => answer("timeout"), timeoutMs);
      // `fireCallback` must be true: with `false` survey-core reports the verdict
      // and puts no errors on the questions, so there would be nothing to name.
      const sync = model.validate(true, false, (hasErrors) => answer(hasErrors ? "invalid" : "valid"));
      if (sync === true) answer("valid");
      else if (sync === false) answer("invalid");
    });

    if (verdict === "valid") return { ok: true, count: 0 };
    if (verdict === "timeout") {
      return {
        ok: false,
        count: 1,
        first: {
          kind: "validation",
          path: "",
          name: "",
          message: "validation did not finish in time, so nothing was stored",
        },
      };
    }
    const errors = collectErrors(model);
    return { ok: false, count: errors.length, first: errors[0] };
  } finally {
    if (timer) clearTimeout(timer);
    // After the verdict, the deadline or a throw, whichever came first. A
    // callback that arrives afterwards finds `settled` true and is ignored.
    model.dispose();
  }
}

/**
 * Every error on the model, in document order. The walk has to include nested
 * questions (`getAllQuestions(false, false, true)`): a matrix cell and a dynamic
 * panel's question are where a record most often goes wrong, and the plain call
 * does not return them.
 */
function collectErrors(model: Model): ResponseFailure[] {
  const found: ResponseFailure[] = [];
  for (const question of model.getAllQuestions(false, false, true)) {
    if (question.errors.length === 0) continue;
    // A cell reports its column's name, so the container is what names it.
    const container = question.parentQuestion;
    const path = container ? `${container.getValueName()}.${question.name}` : question.name;
    found.push({
      kind: "validation",
      path,
      name: container ? container.getValueName() : question.name,
      title: question.title,
      message: question.errors[0].getText(),
    });
  }
  return found;
}
