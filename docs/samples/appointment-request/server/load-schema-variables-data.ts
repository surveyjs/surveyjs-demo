// Ridgeline Family Health — Appointment Request Form: Load JSON Schemas, Variables, and Answers (server)
// https://surveyjs.io/documentation/appointment-request#load-json-schemas-variables-and-answers

// #region sjs:appointment-request.load-schema-variables-data.server
// The appointment page, on the server. The schema is in the HTML.
// The page signs in as the first patient, so the record needs no second request.
const survey = DEMO_SURVEYS.clinicVisit; // id: "clinic-visit"
const json = (await loadSurveyJson(survey.id)) ?? survey.json;
// #endregion
