// Ridgeline Chart — Clinical Encounter Note: Load JSON Schemas, Variables, and Answers (client)
// https://surveyjs.io/documentation/encounter-note#load-json-schemas-variables-and-answers

// #region sjs:encounter-note.load-schema-variables-data.client
import { Model } from "survey-core";

// json came from the server, in the page.
// variables are the open chart: { user_firstName, user_dateOfBirth, user_conditions, … }
function createSurvey(json, variables, data) {
  const survey = new Model(json);

  // Before the answers. Read as {user_dateOfBirth}, {user_conditions}, … and never stored as answers.
  for (const [name, value] of Object.entries(variables)) {
    survey.setVariable(name, value);
  }

  // Prefill, when the demo toolbar asks for it. Merge, so the defaults the chart
  // filled in (provider, site, allergies) are kept beside those answers.
  if (data) survey.mergeData(data);
  return survey;
}
// #endregion
