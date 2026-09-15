import { Serializer } from "survey-core";

/**
 * A matrix column takes the properties of its cell question, so a property
 * registered on `question` would also be offered, and serialized, on every
 * column. The extractor reads no hint there. Serialization asks with the column
 * itself; Creator's property grid asks with the column's template question, which
 * survey-core marks `isContentElement`.
 */
function isColumn(obj: unknown): boolean {
  const element = obj as { getType?: () => string; isContentElement?: boolean } | null;
  return element?.getType?.() === "matrixdropdowncolumn" || element?.isContentElement === true;
}

/**
 * Properties this template adds to SurveyJS. Import this module for its side effect
 * wherever a model, a Creator or the linter is built; registering twice is a no-op.
 *
 * `aiHint` is the note `/api/extract` appends to the prompt for one field. It is
 * registered where `ai-form-response-extractor` reads it, and nowhere else: on the
 * survey (`formDefinition.aiHint`) and on each question once panels are flattened.
 * On a page, a panel or a matrix column it would do nothing, so there it stays
 * unregistered and the linter reports it as `property/unknown`.
 *
 * The next custom property goes here too.
 */
export function registerCustomProperties(): void {
  for (const className of ["survey", "question"]) {
    if (Serializer.findProperty(className, "aiHint")) continue;
    Serializer.addProperty(className, {
      name: "aiHint:text", // multi-line editor in Creator
      displayName: "AI extraction hint",
      category: "general",
      nextToProperty: "description", // the row right under Description
      isLocalizable: false, // the extractor reads a plain string only
      visibleIf: (obj: unknown) => !isColumn(obj),
      isSerializableFunc: (obj: unknown) => !isColumn(obj),
    });
  }
}
registerCustomProperties();
