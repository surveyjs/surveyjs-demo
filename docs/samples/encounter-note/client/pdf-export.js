// Ridgeline Chart — Clinical Encounter Note: Generate PDFs (client)
// https://surveyjs.io/documentation/encounter-note#generate-pdfs

// #region sjs:encounter-note.pdf-export.client
import { SurveyPDF } from "survey-pdf";

async function saveNotePdf(json, { data, variables }) {
  const pdf = new SurveyPDF(json);
  for (const [name, value] of Object.entries(variables ?? {})) pdf.setVariable(name, value);
  if (data) pdf.data = data;
  await pdf.save("encounter-note.pdf");
}
// #endregion
