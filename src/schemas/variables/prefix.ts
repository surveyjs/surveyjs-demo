import type { SurveyJSON } from "../types";

/**
 * Every variable the host publishes about the signed-in user starts with this.
 *
 * A variable is a top-level question of a variable definition (see `index.ts`),
 * so the user is one variable per field, not one object read by path. The prefix
 * does what the path did: `{user_firstName}` can never be mistaken for the clinic
 * form's own `firstName` question.
 */
export const USER_PREFIX = "user_";

type Values = Readonly<Record<string, unknown>>;

/**
 * A plain account (a session user, a stored patient record) as the variables a
 * page publishes: `{ firstName }` becomes `{ user_firstName }`.
 *
 * An account passes through here exactly once, where it is published or where a
 * preset is built from it. A preset's `variables` are already prefixed and are
 * published as they are; a key reading `user_user_…` is that mistake.
 */
export function toVariables(account: Values): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(account).map(([key, value]) => [`${USER_PREFIX}${key}`, value]),
  );
}

/** The inverse: variables back to a plain account, dropping keys without the prefix. */
export function fromVariables(variables: Values): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(variables)
      .filter(([key]) => key.startsWith(USER_PREFIX))
      .map(([key, value]) => [key.slice(USER_PREFIX.length), value]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * A survey that edits a plain record, as the variable definition for that record:
 * every top-level question renamed with the prefix, and every `{name}` reference
 * to a renamed question rewritten with it, in every string property.
 *
 * Top-level means what `survey.getAllQuestions()` returns: questions on pages and
 * in panels. A matrix's columns and a dynamic panel's template keep their names,
 * because the matrix or the panel itself is the one variable.
 */
export function toVariableDefinition(json: SurveyJSON, prefix: string = USER_PREFIX): SurveyJSON {
  const names = new Set<string>();
  const collect = (elements: unknown): void => {
    if (!Array.isArray(elements)) return;
    for (const element of elements) {
      if (!isRecord(element)) continue;
      if (element.type === "panel") collect(element.elements);
      else if (typeof element.name === "string") names.add(element.name);
    }
  };
  collect(json.elements);
  if (Array.isArray(json.pages)) {
    for (const page of json.pages) if (isRecord(page)) collect(page.elements);
  }

  const rewrite = (text: string): string =>
    text.replace(/\{([^{}]+)\}/g, (whole, name: string) =>
      names.has(name.trim()) ? `{${prefix}${name.trim()}}` : whole,
    );

  // `container` is true while walking the survey, its pages and its panels,
  // where a named element is a question to rename. Below a question nothing is
  // renamed: a matrix column called `name` stays `name`.
  const walk = (value: unknown, container: boolean): unknown => {
    if (typeof value === "string") return rewrite(value);
    if (Array.isArray(value)) return value.map((item) => walk(item, container));
    if (!isRecord(value)) return value;
    const isQuestion =
      container &&
      value.type !== "panel" &&
      typeof value.type === "string" &&
      typeof value.name === "string";
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (key === "name" && isQuestion) return [key, `${prefix}${item as string}`];
        const stays = container && !isQuestion && (key === "pages" || key === "elements");
        return [key, walk(item, stays)];
      }),
    );
  };
  return walk(json, true) as SurveyJSON;
}
