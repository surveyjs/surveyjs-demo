// Larkspur CRM — CRM Opportunity Records: Load JSON Schemas, Variables, and Answers (client)
// https://surveyjs.io/documentation/crm-opportunity-records#load-json-schemas-variables-and-answers

// #region sjs:crm.load-schema-variables-data.client
import { Model } from "survey-core";

// The server rendered schema, variables, and record into the page.
// Opening another row: GET /api/storage/results/leads/LEAD-0004 → { id, data }
function createSurvey({ schema, variables, data, readOnly }) {
  const survey = new Model(schema);

  // Before the answers. Read as {user_role}, {user_currency}, … and never saved.
  for (const [name, value] of Object.entries(variables)) {
    survey.setVariable(name, value);
  }

  // Merge, so a value a variable already pre-filled is kept beside the record.
  if (variables) survey.mergeData(data);
  else survey.data = data;

  survey.mode = readOnly ? "display" : "edit";
  return survey;
}
// #endregion
