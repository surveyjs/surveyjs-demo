interface Choice {
  readonly value: string;
  readonly text: string;
}

/**
 * The expression of a calculated value that turns a variable's value into the
 * text a person reads: `business` into "Business".
 *
 * A variable carries what the host app stores, and that is the value, not its
 * label. So the label is no variable: a form that shows one declares a
 * calculated value with `includeIntoResult: false` and this expression, a chain
 * of `iif` over the choices. It follows the variable wherever the variable
 * comes from (a session, a preset, a preset somebody edited in Survey Creator),
 * and it never reaches the submitted data.
 *
 * `fallback` must not be empty: survey-core renders an empty calculated value as
 * the raw `{name}` placeholder.
 */
export function labelExpression(
  variable: string,
  choices: readonly Choice[],
  fallback: string,
): string {
  const quote = (text: string) => `'${text.replace(/'/g, "\'")}'`;
  return choices.reduceRight(
    (rest, choice) => `iif({${variable}} = ${quote(choice.value)}, ${quote(choice.text)}, ${rest})`,
    quote(fallback),
  );
}
