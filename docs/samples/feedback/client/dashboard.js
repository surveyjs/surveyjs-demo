// Cadence — Customer Satisfaction Survey: Analyze Results with Dashboard (client)
// https://surveyjs.io/documentation/feedback#analyze-results-with-dashboard

// #region sjs:feedback.dashboard.client
import { Model } from "survey-core";
import { Dashboard } from "survey-analytics";

const { json } = await fetch("/api/storage/definitions/customer-satisfaction").then((r) => r.json());
const responses = await loadGeneratedResponses(json); // this demo: generated responses

const survey = new Model(json);
const dashboard = new Dashboard({
  questions: survey.getAllQuestions(),
  data: responses,
});
dashboard.render(document.getElementById("dashboard"));
// #endregion
