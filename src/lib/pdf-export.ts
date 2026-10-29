import type { SurveyData, SurveyJSON } from "@/schemas";

function fileNameFor(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "form"}.pdf`;
}

/**
 * The same definition the page renders, saved as a PDF — blank, or filled in.
 *
 * One call is the whole feature: `new SurveyPDF(json)`, assign `data`, `save()`.
 * The form does not need a second layout for print: the JSON that draws the web
 * form draws the document, which is the argument for keeping a form as data.
 *
 * `survey-pdf` pulls in jsPDF and its font tables, so it is imported on demand:
 * nothing of it reaches the page's bundle until somebody asks for a file. The
 * license is applied the same way, and without a key the PDF carries a
 * watermark rather than failing.
 */
export async function exportSurveyToPdf(
  json: SurveyJSON,
  {
    label,
    data,
    variables,
  }: { label: string; data?: SurveyData; variables?: Readonly<Record<string, unknown>> },
): Promise<void> {
  await import("@/lib/surveyjs-license");
  const { SurveyPDF } = await import("survey-pdf");

  const pdf = new SurveyPDF(json, {
    fontSize: 12,
    margins: { left: 10, right: 10, top: 10, bot: 10 },
  });
  // Variables before data, as `createSurveyModel` does: the titles, HTML,
  // expressions and `visibleIf`s read `{user_…}`, and the JSON does not hold it.
  if (variables) {
    for (const [name, value] of Object.entries(variables)) {
      pdf.setVariable(name, value);
    }
  }
  if (data) pdf.data = data;

  await pdf.save(fileNameFor(label));
}
