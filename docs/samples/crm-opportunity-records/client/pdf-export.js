// Larkspur CRM — CRM Opportunity Records: Generate PDFs (client)
// https://surveyjs.io/documentation/crm-opportunity-records#generate-pdfs

// #region sjs:crm.pdf-export.client
import { SurveyPDF } from "survey-pdf";

async function saveLeadPdf(json, { data, variables, fileName }) {
  const pdf = new SurveyPDF(json);
  for (const [name, value] of Object.entries(variables ?? {})) pdf.setVariable(name, value);
  if (data) pdf.data = data;
  await pdf.save(fileName); // "northwind-labs.pdf"
}
// #endregion
