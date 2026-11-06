// Cadence — Customer Satisfaction Survey: Load JSON Schemas, Variables, and Answers (server)
// https://surveyjs.io/documentation/feedback#load-json-schemas-variables-and-answers

// #region sjs:feedback.load-schema-variables-data.server
// The Feedback page, on the server. The schema is in the HTML.
// The page signs in as the first preset, so the account needs no second request.
const survey = DEMO_SURVEYS.satisfaction; // id: "customer-satisfaction"
const json = (await loadSurveyJson(survey.id)) ?? survey.json;
// #endregion
