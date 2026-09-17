/**
 * The signed-in user each demo renders its form for.
 *
 * This is the second half of the pitch. The first half is that a SurveyJS form
 * can be dropped into somebody else's page and look native; this half is that the
 * same JSON definition arrives *already configured for whoever is looking at it* —
 * their name, their plan, their chart — and that the arrangement of the form
 * changes with them, not just the values in it.
 *
 * Mechanically it is one step: every field of the account is published to
 * survey-core as a variable (`model.setVariable("user_firstName", …)`), and the
 * survey JSON reads them by name:
 *
 *  - `"title": "Hi {user_firstName}, …"` pipes the value into text;
 *  - `"defaultValueExpression": "{user_email}"` pre-answers a question;
 *  - `"visibleIf": "{user_isNewPatient} = true"` adds or removes whole pages;
 *  - `"visibleIf": "{user_conditions} contains 'asthma'"` on a *choice* builds a
 *    list out of the account.
 *
 * The `user_` prefix keeps a variable from ever being mistaken for a question:
 * the clinic form has questions called `firstName` and `email` too.
 *
 * What the variables are, and the people a demo can be tried as, is declared once
 * per form in `src/schemas/variables/`, as SurveyJS variable presets. The demos
 * read their "Login as" list from the presets, and the toolbar's "Edit the user"
 * popup renders the presets' **definition**, which is an ordinary survey: the
 * library editing the library's own input, with no bespoke form code anywhere.
 * What is left here is how a host page reads an account for its own header.
 */

/* ── reading an account the reviewer may have edited ────────────────────────── */

export function accountText(
  account: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = account[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Initials for the avatar, from whatever the account currently holds. */
export function accountInitials(account: Record<string, unknown>): string {
  const first = accountText(account, "firstName");
  const last = accountText(account, "lastName");
  const initials = `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase();
  return initials || "?";
}

/** First and last name; an account that keeps one `name` (a records page's session user) shows that. */
export function accountName(account: Record<string, unknown>): string {
  return (
    [accountText(account, "firstName"), accountText(account, "lastName")]
      .filter(Boolean)
      .join(" ") || accountText(account, "name")
  );
}

/**
 * Which of a form's declared variables the definition on screen actually reads.
 *
 * Found by scanning the definition for a `{user_key}` reference rather than kept
 * in a hand-written list, so the panel can never claim a variable is wired when
 * it is not — including after a reviewer has typed a new one into the JSON.
 */
export function usedVariableNames(json: unknown, names: readonly string[]): readonly string[] {
  const source = JSON.stringify(json ?? {});
  return names.filter((name) => source.includes(`{${name}}`));
}
