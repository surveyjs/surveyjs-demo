import { SurveyVariablePresets, type ISurveyVariablePresets } from "survey-core";
import { cadenceVariablePresets } from "./cadence";
import { leadsVariablePresets } from "./leads";
import { patientVariablePresets } from "./patient";

export { CADENCE_PLANS, cadenceVariablePresets } from "./cadence";
export { LEADS_USERS, leadsVariablePresets } from "./leads";
export { patientVariablePresets } from "./patient";
export { labelExpression } from "./labels";
export { USER_PREFIX, fromVariables, toVariableDefinition, toVariables } from "./prefix";

/**
 * What the host injects into each personalized form, keyed by schema id.
 *
 * An `ISurveyVariablePresets` of `survey-core` is a **definition**, one ordinary
 * survey JSON whose top-level questions are the variables, and named **presets**
 * of values for them. Everything that has to know what `{user_role}` is reads
 * this one object: the linter (`options.variablePresets`), the editor's preset
 * selector, the demos' "Login as" lists, the full edition's Survey Creator, and
 * the tester once a personalized suite is written.
 *
 * It declares the variables and gives test values for them. It is not where the
 * runtime values come from: a page still gets who it is rendered for from the
 * session (`src/storage/session.ts`) and publishes it with `setVariable`.
 */
const variablePresetsRegistry: Readonly<Record<string, ISurveyVariablePresets>> = {
  "customer-satisfaction": cadenceVariablePresets,
  "clinic-visit": patientVariablePresets,
  "encounter-note": patientVariablePresets,
  leads: leadsVariablePresets,
};

/**
 * A form's variable presets, found the way `getSchemaDefinition` finds its JSON.
 * They are constants today; a form that reads no variable has none.
 */
export function getVariablePresets(schemaId: string): ISurveyVariablePresets | undefined {
  return variablePresetsRegistry[schemaId];
}

/** The names a definition declares, as a form's JSON spells them: `user_role`. */
export function getVariableNames(presets: ISurveyVariablePresets | undefined): readonly string[] {
  if (!presets) return [];
  const companion = new SurveyVariablePresets(presets);
  const names = companion.getVariableNames();
  companion.dispose();
  return names;
}
