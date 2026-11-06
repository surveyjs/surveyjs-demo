// Ridgeline Family Health — Appointment Request Form: Generate PDFs (client)
// https://surveyjs.io/documentation/appointment-request#generate-pdfs

// #region sjs:appointment-request.pdf-export.client
import { SurveyPDF } from "survey-pdf";

async function saveRequestPdf(json, { data, variables, locale }) {
  const pdf = new SurveyPDF(json);
  for (const [name, value] of Object.entries(variables ?? {})) pdf.setVariable(name, value);
  if (locale) pdf.locale = locale; // "es" renders the Spanish texts; the demo omits this line
  if (data) pdf.data = data;
  await pdf.save("appointment-request.pdf");
}
// #endregion
