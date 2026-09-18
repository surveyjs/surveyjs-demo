import type { ISurveyTests } from "survey-core/tester";
import checkoutTests from "./checkout.tests.json";

/**
 * A form's behaviour suite, the way `getSchemaDefinition` finds its JSON and
 * `getVariablePresets` finds its variables: one file per schema id, named
 * `<schema-id>.tests.json`, and nothing else in it.
 *
 * `survey-core/tester` is a subpath of `survey-core` itself, MIT-licensed like
 * the linter, so both editions have it.
 *
 * Only `checkout` has a suite so far. A form without one passes the test step —
 * see `src/lib/checks/check-definition.ts`. Writing the other six is its own task.
 */
const testRegistry: Record<string, ISurveyTests> = {
  checkout: checkoutTests as ISurveyTests,
};

export function getSurveyTests(schemaId: string): ISurveyTests | undefined {
  return Object.hasOwn(testRegistry, schemaId) ? testRegistry[schemaId] : undefined;
}

/** The ids that have a suite, for a spec that wants to loop over them. */
export function getTestedSchemaIds(): readonly string[] {
  return Object.keys(testRegistry);
}
