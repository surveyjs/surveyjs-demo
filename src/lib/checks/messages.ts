/**
 * The one sentence a refusal is reported with.
 *
 * The API's `error`, the MIT editor's line under the Monaco pane, Survey
 * Creator's toast in the full edition and the message a records page shows under
 * the form's heading are all this string. Written once so they cannot drift:
 * a spec that asserts the sentence asserts it everywhere at the same time.
 *
 * Pure string building — no survey-core, no React, no Next.js.
 */

/** Where the first error is, in words a person can act on. */
export interface RefusalWhere {
  /** The first error's own sentence, from the linter, the tester or the shape walk. */
  readonly message: string;
  /** The place it is: a JSON path, a question's path, or a test's name and step. */
  readonly where?: string;
}

/** A definition was refused; a response was refused. The two leads differ by one word. */
export const NOT_SAVED = "Not saved";
export const NOT_STORED = "Not stored";

/**
 * `Not saved: <message> (<where>).`, plus ` <n> more.` when more than one thing
 * was wrong. `count` is the total, so the extra count is `count - 1`.
 */
export function refusalMessage(
  lead: typeof NOT_SAVED | typeof NOT_STORED,
  first: RefusalWhere,
  count = 1,
): string {
  const message = first.message.replace(/\s*\.\s*$/, "");
  // A place the sentence already gives is not repeated: an unknown key names
  // itself, and `"nosuchquestion" is not a question of this form (nosuchquestion)`
  // says it twice.
  const place = first.where && !message.includes(first.where) ? ` (${first.where})` : "";
  const rest = count > 1 ? ` ${count - 1} more.` : "";
  return `${lead}: ${message}${place}.${rest}`;
}
