// Cadence — Customer Satisfaction Survey: Generate PDFs (client)
// https://surveyjs.io/documentation/feedback#generate-pdfs

// #region sjs:feedback.pdf-export.client
import { SurveyPDF } from "survey-pdf";

async function saveFeedbackPdf(json, { data, variables }) {
  const pdf = new SurveyPDF(json);
  for (const [name, value] of Object.entries(variables ?? {})) pdf.setVariable(name, value);
  if (data) pdf.data = data;
  await pdf.save("satisfaction-survey.pdf");
}
// #endregion
