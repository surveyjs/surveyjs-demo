---
nav: workOrders
summary: A field service job sheet as one form: a list of stored work orders, and one form that views, edits and adds them.
---

The list on the left is this application's own React component, not a SurveyJS one. An editable list view built on the SurveyJS matrix is planned; it is not in this demo.

## Data in

The server reads the list, this visitor's definition and the first record; a new record can instead be read off an uploaded PDF, scan or photo.

```ts
const rows = await listResults("workOrders");
const schema = await loadSurveyJson("work-order") ?? getSchemaDefinition("work-order").json;
const record = await getResult("workOrders", rows[0].id);
```

[src/app/work-orders/page.tsx](<../src/app/work-orders/page.tsx>)

## What the definition reads

Every question carries an `aiHint` naming the box it is printed in, which is what the extractor is given along with the document.

```json definition=visitDate.aiHint
Section 1, the VISIT DATE box. Return YYYY-MM-DD.
```

[Combine paper and online data](https://surveyjs.io/documentation/combine-paper-and-online-survey-form-data) · [Custom properties in the property grid](https://surveyjs.io/survey-creator/documentation/property-grid-customization#add-custom-properties-to-the-property-grid)

The Source document panel exists only on a record that was read off paper, so a sheet typed on a tablet shows nothing about an original.

```json definition=source.visibleIf
{sourceDocument} notempty
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

What was done is required the moment the status leaves draft.

```json definition=workPerformed.requiredIf
{status} anyof ['completed', 'invoiced']
```

[Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

A completed sheet entered by hand needs a signature; one read off paper does not, because the signature is on the original.

```json definition=customerSignature.requiredIf
{status} anyof ['completed', 'invoiced'] and {sourceDocument} empty
```

[Signature pad](https://surveyjs.io/form-library/documentation/api-reference/signature-pad-model) · [Data validation](https://surveyjs.io/form-library/documentation/data-validation)

The total is the parts total plus the labor total, rounded the same way the list column recomputes it.

```json definition=total.expression
round({partsTotal} + {laborTotal}, 2)
```

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Dynamic matrix](https://surveyjs.io/form-library/documentation/api-reference/dynamic-matrix-table-question-model)

## Data out

Saving stores every answer, and a record read from a document also stores a link to its original and when it was read.

```http
PUT /api/storage/results/workOrders/WO-2026-0120
{ "data": { "jobNumber": "WO-2026-0120", "parts": [ … ], "sourceDocument": [ … ] } }
→ 200 { "id": "WO-2026-0120", "data": { … } }
```

[src/app/api/storage/results/[collectionId]/[id]/route.ts](<../src/app/api/storage/results/[collectionId]/[id]/route.ts>)

## Features

### Server-side validation

The route checks the shape of every answer, and the completeness of anything that is no longer a draft, before it stores it.

[Server-side validation](https://surveyjs.io/form-library/documentation/data-validation#server-side-validation) · [Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [Server-side validation (example)](https://surveyjs.io/form-library/examples/javascript-server-side-form-validation/reactjs) · [src/lib/checks/check-response.ts](../src/lib/checks/check-response.ts) · [Validate the response (backend)](https://surveyjs.io/backend-integration/examples#validate)

### AI extraction from a PDF, scan or photo

Add from document posts the file to `/api/extract`, which reads it against this definition and its hints and opens the result as a draft.

[Combine paper and online data](https://surveyjs.io/documentation/combine-paper-and-online-survey-form-data) · [Extracting data from paper forms (example)](https://surveyjs.io/form-library/examples/extract-data-from-paper-forms-pdf/reactjs) · [src/app/api/extract/route.ts](../src/app/api/extract/route.ts) · [src/components/extract/ExtractFromDocument.tsx](../src/components/extract/ExtractFromDocument.tsx) · [Paper, PDF and images (backend)](https://surveyjs.io/backend-integration/examples#extract)

### The original kept beside the record

`keepSourceDocument` stores the original beside the record and links it, so the reading can always be checked against the paper.

[File question](https://surveyjs.io/form-library/documentation/api-reference/file-model) · [File upload (example)](https://surveyjs.io/form-library/examples/file-upload/reactjs) · [src/storage/documents.ts](../src/storage/documents.ts) · [Files outside the response (backend)](https://surveyjs.io/backend-integration/examples#files)

### A signature that a completed record needs

The sign-off page holds a signature pad the definition requires on a completed sheet.

[Signature pad](https://surveyjs.io/form-library/documentation/api-reference/signature-pad-model) · [Signature pad (example)](https://surveyjs.io/form-library/examples/signature-pad-widget-javascript/reactjs) · [src/schemas/work-order.ts](../src/schemas/work-order.ts)

### New-record defaults from the session

A new sheet gets the next job number and the standard labor rate in code, and a sheet read off paper keeps the number printed on it.

[Survey data model](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model) · [Auto-populating fields (example)](https://surveyjs.io/form-library/examples/auto-populate-form-fields/reactjs) · [src/schemas/collections/work-order.ts](../src/schemas/collections/work-order.ts)

### Mapped columns plus the document

`toColumns` derives the five list columns from each document, the total recomputed from the parts and the labor rather than read back.

[Storing survey results](https://surveyjs.io/form-library/documentation/how-to-store-survey-results) · [Saving and restoring responses (example)](https://surveyjs.io/form-library/examples/save-and-restore-user-responses-to-complete-survey/reactjs) · [src/schemas/collections/work-order.ts](../src/schemas/collections/work-order.ts) · [Responses in a relational database (backend)](https://surveyjs.io/backend-integration/examples#relational)

### One JSON definition, edited from the dock

Two pages of JSON hold the questions, the totals, the rules and a hint per box.

[Form Library](https://surveyjs.io/form-library/documentation/overview) · [Backend integration](https://surveyjs.io/documentation/backend-integration) · [src/schemas/work-order.ts](../src/schemas/work-order.ts)

### Choices from your API *(coming)*

The technician and equipment lists are still constants in the schema file.

[choicesByUrl](https://surveyjs.io/form-library/documentation/api-reference/choicesrestful) · [Choices from a REST service (example)](https://surveyjs.io/form-library/examples/dropdown-menu-load-data-from-restful-service/reactjs) · [Choices from the web (backend)](https://surveyjs.io/backend-integration/examples#choices)

### Per-field confidence in the review *(coming)*

The extractor returns answers without saying how sure it is of each one.

[Paper, PDF and images (backend)](https://surveyjs.io/backend-integration/examples#extract)

<!-- edition: full -->
### Job sheet PDF

Save as PDF prints the record box by box onto the company's own blank, with a continuation sheet for as many parts as it has.

[PDF Generator](https://surveyjs.io/pdf-generator/documentation/overview) · [src/features/full/work-order-pdf.ts](../src/features/full/work-order-pdf.ts)
<!-- /edition -->

<!-- edition: full -->
### Dashboard (View analytics)

View analytics charts the stored work orders from the same definition.

[Dashboard](https://surveyjs.io/dashboard/documentation/overview) · [Dashboard for React](https://surveyjs.io/dashboard/documentation/get-started-react) · [Responses in the Dashboard (backend)](https://surveyjs.io/backend-integration/examples#dashboard)
<!-- /edition -->

<!-- edition: full -->
### Survey Creator (Open in Creator)

The dock's editor button opens this definition in the drag-and-drop designer.

[Survey Creator](https://surveyjs.io/survey-creator/documentation/overview) · [Survey Creator for React](https://surveyjs.io/survey-creator/documentation/get-started-react) · [Load and save definitions (backend)](https://surveyjs.io/backend-integration/examples#creator-save)
<!-- /edition -->

## Source files

- [src/app/work-orders/page.tsx](<../src/app/work-orders/page.tsx>)
- [src/app/work-orders/[id]/page.tsx](<../src/app/work-orders/[id]/page.tsx>)
- [src/app/work-orders/from-document/page.tsx](<../src/app/work-orders/from-document/page.tsx>)
- [src/schemas/work-order.ts](../src/schemas/work-order.ts)
- [src/schemas/collections/work-order.ts](../src/schemas/collections/work-order.ts)
- [src/components/WorkOrdersView.tsx](../src/components/WorkOrdersView.tsx)
- [src/components/extract/ExtractFromDocument.tsx](../src/components/extract/ExtractFromDocument.tsx)
- [src/app/api/extract/route.ts](../src/app/api/extract/route.ts)
- [src/storage/documents.ts](../src/storage/documents.ts)

## What your server does

<!-- TODO: surveyjs.io/backend-integration/examples is not published yet. Every link to it in this file uses an anchor from its layout proposal; check each one when the page goes live -->

- [Load the definition and the open record](https://surveyjs.io/backend-integration/examples#load)
- [List the records from columns mapped out of each response](https://surveyjs.io/backend-integration/examples#relational)
- [Read the answers off a PDF, scan or photo](https://surveyjs.io/backend-integration/examples#extract)
- [Keep the uploaded original outside the response](https://surveyjs.io/backend-integration/examples#files)
- [Validate the response against the definition](https://surveyjs.io/backend-integration/examples#validate)
- [Save the response](https://surveyjs.io/backend-integration/examples#save)
