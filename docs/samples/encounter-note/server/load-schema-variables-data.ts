// Ridgeline Chart — Clinical Encounter Note: Load JSON Schemas, Variables, and Answers (server)
// https://surveyjs.io/documentation/encounter-note#load-json-schemas-variables-and-answers

// #region sjs:encounter-note.load-schema-variables-data.server
// The Encounter note page, on the server. The schema is in the HTML.
// The page opens the first chart, so the patient needs no second request.
const survey = DEMO_SURVEYS.encounterNote; // id: "encounter-note"
const json = (await loadSurveyJson(survey.id)) ?? survey.json;
// #endregion
