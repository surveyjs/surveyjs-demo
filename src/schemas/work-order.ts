import type { SchemaDefinition, SurveyJSON } from "./types";

/** Dollars and cents, as the job sheet prints them. */
const USD = { displayStyle: "currency", currency: "USD" } as const;

/** The work order's status values, which the list's badge also reads. */
export const WORK_ORDER_STATUSES = [
  { value: "draft", text: "Draft" },
  { value: "scheduled", text: "Scheduled" },
  { value: "inProgress", text: "In progress" },
  { value: "completed", text: "Completed" },
  { value: "invoiced", text: "Invoiced" },
] as const;

/** Equipment types, which the list's Equipment column shows by their text. */
// TODO(choices-from-api): load from `/api/equipment-types` once choices come
// from the server; until then this static list is the source for both.
export const EQUIPMENT_TYPES = [
  { value: "airConditioning", text: "Air conditioning" },
  { value: "heatPump", text: "Heat pump" },
  { value: "boiler", text: "Boiler" },
  { value: "ventilation", text: "Ventilation" },
  { value: "refrigeration", text: "Refrigeration" },
  { value: "other", text: "Other" },
] as const;

// TODO(choices-from-api): load from `/api/technicians`.
export const TECHNICIANS = [
  { value: "tomasHartley", text: "Tomas Hartley" },
  { value: "gracePellerin", text: "Grace Pellerin" },
  { value: "nadiaSokolov", text: "Nadia Sokolov" },
] as const;

export const OUTCOMES = [
  { value: "resolved", text: "Resolved" },
  { value: "temporaryFix", text: "Temporary fix" },
  { value: "partsOnOrder", text: "Parts on order" },
  { value: "followUpRequired", text: "Follow-up visit required" },
] as const;

/**
 * A field service work order: the job sheet a technician fills in on site, as
 * a survey.
 *
 * Two audiences read this definition, as they do every paper form here. A
 * person reads `title`. The model reads `aiHint`, which is where the sheet
 * lives: which box an answer is printed in and how it is written. `aiHint` is a
 * registered property (`custom-properties.ts`), on the survey and on questions
 * only, because those are the two places the extractor reads it.
 *
 * Every question has a box on the sheet except the two in Source document,
 * which the app sets when a record is read from a document.
 */
export const workOrderJson: SurveyJSON = {
  title: "Work order",
  description: "Create or edit a job sheet, box by box as the paper form.",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  showProgressBar: true,
  aiHint:
    "The document is a one-page field service job sheet from Tallis Mechanical Services, sometimes with continuation sheets headed 'Job sheet (continued)' that carry more parts rows. The company's own name, address and license line are printed at the top: they are not the customer. Every box has a small printed label in its top-left corner, and each question below names the label of the box it comes from. Read a value out of that box and nowhere else. The sheet runs top to bottom in six numbered sections: 1 Job, 2 Customer and site, 3 Equipment, 4 Work, 5 Parts and labor, 6 Sign-off. Where a row of small square boxes offers choices, the answer is the choice whose square is crossed or ticked. Dates are written month first, as MM/DD/YYYY or M/D/YY: return them as YYYY-MM-DD, reading a two-digit year as 20xx. Times are written on a 24-hour clock as HH:MM: return them as HH:mm with a leading zero. Money is written in dollars with or without a $ sign and a thousands comma: return a plain number such as 1195.25. Values may be typed or handwritten; read handwriting carefully and never guess a digit into a different number. When a box is blank, return null for it, never an empty string, and never invent a value.",
  pages: [
    {
      name: "jobPage",
      title: "Job and site",
      elements: [
        {
          type: "panel",
          name: "source",
          title: "Source document",
          description: "This record was read from a document. The original, with its signature, is linked here.",
          visibleIf: "{sourceDocument} notempty",
          elements: [
            {
              type: "file",
              name: "sourceDocument",
              title: "Original document",
              readOnly: true,
              storeDataAsText: false,
              allowMultiple: false,
              allowImagesPreview: true,
              aiHint:
                "Not on paper. The app links the document itself when it creates the record, so return null.",
            },
            {
              type: "text",
              name: "importedAt",
              title: "Read from the document (UTC)",
              inputType: "datetime-local",
              readOnly: true,
              startWithNewLine: false,
              aiHint:
                "Not on paper. The app records when the document was read, so return null.",
            },
          ],
        },
        {
          type: "panel",
          name: "job",
          title: "Job",
          elements: [
            {
              type: "text",
              name: "jobNumber",
              title: "Job number",
              isRequired: true,
              maskType: "pattern",
              // Stored as printed, hyphens included: the id, the list and the sheet all read it.
              maskSettings: { pattern: "WO-9999-9999", saveMaskedValue: true },
              placeholder: "WO-____-____",
              aiHint:
                "The JOB NO. box at the top right of the sheet, beside the 'Job sheet' title. Printed as WO-, four digits, a hyphen and four more digits, for example WO-2026-0130. Return it exactly in that form.",
            },
            {
              type: "dropdown",
              name: "status",
              title: "Status",
              startWithNewLine: false,
              choices: [...WORK_ORDER_STATUSES],
              aiHint:
                "The STATUS (OFFICE USE) row of squares in section 1. It is printed on the sheet but not read from it: a record read from paper always starts as a draft. Return null.",
            },
            {
              type: "text",
              name: "visitDate",
              title: "Visit date",
              inputType: "date",
              isRequired: true,
              aiHint: "Section 1, the VISIT DATE box. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "arrivalTime",
              title: "Arrived",
              inputType: "time",
              startWithNewLine: false,
              aiHint: "Section 1, the ARRIVED box, a 24-hour time. Return HH:mm.",
            },
            {
              type: "text",
              name: "departureTime",
              title: "Left",
              inputType: "time",
              startWithNewLine: false,
              aiHint: "Section 1, the LEFT box, a 24-hour time. Return HH:mm.",
            },
            {
              // Built-in functions only. `dateDiff` rounds "hours" up and parses
              // dates, not a bare "HH:mm", so both times go onto one fixed date
              // (no daylight-saving change on it) and minutes become tenths.
              type: "expression",
              name: "hoursOnSite",
              title: "Hours on site",
              startWithNewLine: false,
              expression:
                "iif({arrivalTime} notempty and {departureTime} notempty, round(dateDiff('2000-01-01T' + {arrivalTime}, '2000-01-01T' + {departureTime}, 'minutes') / 60, 1), '')",
              aiHint:
                "Section 1, the HOURS ON SITE box, a number with at most one decimal. Return it as a number.",
            },
          ],
        },
        {
          type: "panel",
          name: "customer",
          title: "Customer and site",
          elements: [
            {
              type: "text",
              name: "customerName",
              title: "Customer",
              isRequired: true,
              aiHint:
                "Section 2, the CUSTOMER box: the organization the work was done for, never the service company in the sheet's header.",
            },
            {
              type: "text",
              name: "purchaseOrder",
              title: "Customer PO / reference",
              startWithNewLine: false,
              aiHint: "Section 2, the CUSTOMER PO / REFERENCE box. Return it as written.",
            },
            {
              type: "text",
              name: "contactName",
              title: "Site contact",
              aiHint: "Section 2, the SITE CONTACT box: a person's name.",
            },
            {
              type: "text",
              name: "contactPhone",
              title: "Contact phone",
              inputType: "tel",
              startWithNewLine: false,
              aiHint:
                "Section 2, the PHONE box beside the site contact. Return it as (999) 999-9999.",
            },
            {
              type: "comment",
              name: "siteAddress",
              title: "Site address",
              isRequired: true,
              rows: 2,
              aiHint:
                "Section 2, the SITE ADDRESS box, one or two lines. Keep the line break between the site's name and the street line when there is one.",
            },
          ],
        },
        {
          type: "panel",
          name: "equipment",
          title: "Equipment",
          elements: [
            {
              type: "dropdown",
              name: "equipmentType",
              title: "Equipment type",
              // TODO(choices-from-api): load from `/api/equipment-types` (EQUIPMENT_TYPES above).
              choices: [...EQUIPMENT_TYPES],
              aiHint:
                "Section 3, the TYPE row of squares: Air conditioning, Heat pump, Boiler, Ventilation, Refrigeration, Other. Return the value of the crossed one.",
            },
            {
              type: "boolean",
              name: "warranty",
              title: "Under warranty",
              startWithNewLine: false,
              aiHint:
                "Section 3, UNDER WARRANTY with a Yes square and a No square. true when Yes is crossed, false when No is crossed, null when neither is.",
            },
            {
              type: "text",
              name: "manufacturer",
              title: "Manufacturer",
              aiHint: "Section 3, the MANUFACTURER box.",
            },
            {
              type: "text",
              name: "modelNumber",
              title: "Model no.",
              startWithNewLine: false,
              aiHint: "Section 3, the MODEL NO. box. Return it as written, letters and digits alike.",
            },
            {
              type: "text",
              name: "serialNumber",
              title: "Serial no.",
              startWithNewLine: false,
              aiHint:
                "Section 3, the SERIAL NO. box. Return it as written; do not confuse it with the model number beside it.",
            },
            {
              type: "text",
              name: "installedOn",
              title: "Installed",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Section 3, the INSTALLED box, a date. Return YYYY-MM-DD.",
            },
          ],
        },
      ],
    },
    {
      name: "workPage",
      title: "Work and sign-off",
      elements: [
        {
          type: "panel",
          name: "work",
          title: "Work",
          elements: [
            {
              type: "comment",
              name: "faultReported",
              title: "Fault reported",
              isRequired: true,
              rows: 3,
              aiHint: "Section 4, the FAULT REPORTED box. Return the whole text as one string.",
            },
            {
              type: "comment",
              name: "workPerformed",
              title: "Work performed",
              rows: 3,
              requiredIf: "{status} anyof ['completed', 'invoiced']",
              aiHint: "Section 4, the WORK PERFORMED box. Return the whole text as one string.",
            },
            {
              type: "radiogroup",
              name: "outcome",
              title: "Outcome",
              colCount: 2,
              choices: [...OUTCOMES],
              requiredIf: "{status} anyof ['completed', 'invoiced']",
              aiHint:
                "Section 4, the OUTCOME row of squares: Resolved, Temporary fix, Parts on order, Follow-up visit required. Return the value of the crossed one.",
            },
            {
              type: "comment",
              name: "followUpNotes",
              title: "Follow-up notes",
              rows: 2,
              visibleIf: "{outcome} notempty and {outcome} <> 'resolved'",
              aiHint: "Section 4, the FOLLOW-UP NOTES box. Return the whole text as one string.",
            },
          ],
        },
        {
          type: "panel",
          name: "partsAndLabor",
          title: "Parts and labor",
          elements: [
            {
              type: "matrixdynamic",
              name: "parts",
              title: "Parts",
              addRowText: "Add a part",
              rowCount: 0,
              columns: [
                { name: "partNumber", title: "Part no.", cellType: "text" },
                { name: "description", title: "Description", cellType: "text", minWidth: "12rem" },
                {
                  name: "quantity",
                  title: "Qty",
                  cellType: "text",
                  inputType: "number",
                  min: 1,
                  defaultValue: 1,
                },
                {
                  name: "unitPrice",
                  title: "Unit price",
                  cellType: "text",
                  inputType: "number",
                  min: 0,
                },
                {
                  name: "linePrice",
                  title: "Line price",
                  cellType: "expression",
                  readOnly: true,
                  ...USD,
                  expression: "round({row.quantity} * {row.unitPrice}, 2)",
                },
              ],
              aiHint:
                "Section 5, the PARTS table: columns PART NO., DESCRIPTION, QTY, UNIT PRICE and LINE PRICE, six ruled rows on the first sheet and more on any continuation sheet. Return one object per row that has anything written in it, in order down the first sheet and then down each continuation sheet, and skip empty rows. Put quantity, unitPrice and linePrice as numbers.",
            },
            {
              type: "expression",
              name: "partsTotal",
              title: "Parts total",
              ...USD,
              expression: "round(sumInArray({parts}, 'linePrice'), 2)",
              aiHint: "Section 5 totals block, the PARTS TOTAL box. Return a number.",
            },
            {
              type: "text",
              name: "laborHours",
              title: "Labor hours",
              inputType: "number",
              min: 0,
              step: 0.25,
              startWithNewLine: false,
              aiHint:
                "Section 5 totals block, the LABOR HOURS box: hours billed, which can differ from hours on site. Return a number such as 2.5.",
            },
            {
              type: "text",
              name: "laborRate",
              title: "Rate per hour",
              inputType: "number",
              min: 0,
              defaultValue: 85,
              startWithNewLine: false,
              aiHint:
                "Section 5 totals block, the RATE / HR box, in dollars. Return the number printed there, whatever it is.",
            },
            {
              type: "expression",
              name: "laborTotal",
              title: "Labor total",
              startWithNewLine: false,
              ...USD,
              expression: "round({laborHours} * {laborRate}, 2)",
              aiHint: "Section 5 totals block, the LABOR TOTAL box. Return a number.",
            },
            {
              type: "expression",
              name: "total",
              title: "Total",
              startWithNewLine: false,
              ...USD,
              expression: "round({partsTotal} + {laborTotal}, 2)",
              aiHint: "Section 5 totals block, the TOTAL box at its right-hand end. Return a number.",
            },
          ],
        },
        {
          type: "panel",
          name: "signOff",
          title: "Sign-off",
          elements: [
            {
              type: "dropdown",
              name: "technicianName",
              title: "Technician",
              // TODO(choices-from-api): load from `/api/technicians` (TECHNICIANS above).
              choices: [...TECHNICIANS],
              aiHint:
                "Section 6, the TECHNICIAN box: the name of the service company's technician. Return the value of the matching choice.",
            },
            {
              type: "signaturepad",
              name: "customerSignature",
              title: "Customer signature",
              dataFormat: "png",
              signatureWidth: 400,
              signatureHeight: 150,
              requiredIf: "{status} anyof ['completed', 'invoiced'] and {sourceDocument} empty",
              aiHint:
                "Section 6, the CUSTOMER SIGNATURE box. It is printed on the sheet but not read from it: the signature stays on the original document, which the record links. Return null.",
            },
            {
              type: "text",
              name: "signedByName",
              title: "Print name",
              requiredIf: "{status} anyof ['completed', 'invoiced']",
              aiHint: "Section 6, the PRINT NAME box under the customer signature: the signer's name.",
            },
            {
              type: "text",
              name: "signedAt",
              title: "Signed on",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Section 6, the DATE box beside the print name. Return YYYY-MM-DD.",
            },
          ],
        },
      ],
    },
  ],
  completedHtml: "<h4>Work order saved.</h4>",
};

export const workOrderSchema: SchemaDefinition = {
  id: "work-order",
  title: "Work order",
  description: "A field service job sheet: the visit, the equipment, parts and labor, and the customer's sign-off.",
  json: workOrderJson,
};
