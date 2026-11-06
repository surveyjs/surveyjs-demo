// Ridgeline Family Health — Appointment Request Form: Load JSON Schemas, Variables, and Answers (client)
// https://surveyjs.io/documentation/appointment-request#load-json-schemas-variables-and-answers

// #region sjs:appointment-request.load-schema-variables-data.client
import { Model } from "survey-core";
import "survey-core/i18n/spanish"; // "Siguiente", "Anterior", "Respuesta requerida." for the Spanish form

// json came from the server, in the page.
// variables are the signed-in patient's record: { user_firstName, user_preferredLanguage, user_conditions, … }
function createSurvey(json, variables, data, locale) {
  const survey = new Model(json);

  // Before the answers. Read as {user_firstName}, {user_homeLocation}, … and never stored as answers.
  for (const [name, value] of Object.entries(variables)) {
    survey.setVariable(name, value);
  }

  // "es" when the record says Spanish, "en" otherwise. The definition carries both languages.
  if (locale) survey.locale = locale;

  // Prefill, when the demo toolbar asks for it. Merge, so the values the record
  // filled in (name, office, clinician) are kept beside those answers.
  if (data) survey.mergeData(data);
  return survey;
}
// #endregion
