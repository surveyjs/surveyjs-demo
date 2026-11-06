// Cadence — Customer Satisfaction Survey: Load JSON Schemas, Variables, and Answers (client)
// https://surveyjs.io/documentation/feedback#load-json-schemas-variables-and-answers

// #region sjs:feedback.load-schema-variables-data.client
import { Model } from "survey-core";

// json came from the server, in the page.
// variables are the active account: { user_firstName, user_plan, user_monthsActive, … }
function createSurvey(json, variables, data) {
  const survey = new Model(json);

  // Before the answers. Read as {user_firstName}, {user_plan}, … and never stored as answers.
  for (const [name, value] of Object.entries(variables)) {
    survey.setVariable(name, value);
  }

  // Prefill, when the demo toolbar asks for it. Merge, so the account's default for
  // "how long have you been using Cadence?" is kept beside those answers.
  if (data) survey.mergeData(data);
  return survey;
}
// #endregion
