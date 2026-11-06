// Larkspur CRM — CRM Opportunity Records: Analyze Results with Dashboard (client)
// https://surveyjs.io/documentation/crm-opportunity-records#analyze-results-with-dashboard

// #region sjs:crm.dashboard.client
import { Model } from "survey-core";
import { Dashboard } from "survey-analytics";

const { json } = await fetch("/api/storage/definitions/leads").then((r) => r.json());
const responses = await loadGeneratedResponses(json); // this demo: generated, not the stored leads

const survey = new Model(json);
const dashboard = new Dashboard({
  questions: survey.getAllQuestions(),
  data: responses,
});
dashboard.render(document.getElementById("dashboard"));
// #endregion
