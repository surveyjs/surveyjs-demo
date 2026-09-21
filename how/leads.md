---
nav: leads
summary: A CRM opportunity as one form: contacts in a dynamic panel, line items and totals in matrices, and rules that follow the signed-in user.
---

The list on the left is this application's own React component, not a SurveyJS one. An editable list view built on the SurveyJS matrix is planned; it is not in this demo.

## Data in

The server reads the list, this visitor's definition, the first record and the people the page may be rendered for, and sends all four in the HTML.

```ts
const rows = await listResults("leads");
const schema = await loadSurveyJson("leads") ?? getSchemaDefinition("leads").json;
const record = await getResult("leads", rows[0].id);
const users = await listSessionUsers("leads");
```

[src/app/(shell)/leads/page.tsx](<../src/app/(shell)/leads/page.tsx>)

## What the definition reads

Hiding a question by role or by stage never deletes its answer, which is what keeps the hidden row ids through a save.

```json definition=(survey).clearInvisibleValues
none
```

[Survey data model](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model) · [Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

The budget amount is rendered only for a session whose user is a manager.

```json definition=budgetAmount.visibleIf
{budgetConfirmed} = true and {user_role} = 'manager'
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

A discount over 20% fails validation unless the signed-in user is a manager.

```json definition=lineItems › discountPct.expression
{row.discountPct} <= 20 or {user_role} = 'manager'
```

[Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

The deal value is summed out of the line items on every keystroke, never accumulated and never read back from storage.

```json definition=dealValue.expression
round(sumInArray({lineItems}, 'lineTotal'), 2)
```

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values)

The economic-buyer warning counts the contacts whose role says so, so the rule lives in the definition rather than in the page.

```json definition=economicBuyerWarning.visibleIf
countInArray({contacts}, 'fullName') > 0 and countInArray({contacts}, 'fullName', '{role} = economicBuyer') = 0
```

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Dynamic panel](https://surveyjs.io/form-library/documentation/api-reference/dynamic-panel-model)

## Data out

Saving stores the whole document, gives every contact and row without one a stable id, and re-derives the list columns from it.

```http
PUT /api/storage/results/leads/LEAD-0001
{ "data": { "accountName": "Bluepeak Energy", "lineItems": [ … ] } }
→ 200 { "id": "LEAD-0001", "data": { … } }
```

[src/app/api/storage/results/[collectionId]/[id]/route.ts](<../src/app/api/storage/results/[collectionId]/[id]/route.ts>)

## Features

### Server-side validation

The route rebuilds this same model with the signed-in user's variables and refuses a record the definition rejects, naming the first bad cell.

[Server-side validation](https://surveyjs.io/form-library/documentation/data-validation#server-side-validation) · [Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [Server-side validation (example)](https://surveyjs.io/form-library/examples/javascript-server-side-form-validation/reactjs) · [src/lib/checks/check-response.ts](../src/lib/checks/check-response.ts)

### Variables from the server

`user_id`, `user_name`, `user_role` and `user_currency` come from `listSessionUsers` on the server, which is `getSession` in your app.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [setVariable](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#setVariable) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/storage/session.ts](../src/storage/session.ts)

### Variable presets

The presets declare those four variables and carry the two people this page signs in as, so the editor and the linter know them too.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/schemas/variables/leads.ts](../src/schemas/variables/leads.ts)

### One JSON definition, edited from the page header

Three pages of JSON hold every question, every total and every rule on this page, the ones that read the signed-in user included.

[Form Library](https://surveyjs.io/form-library/documentation/overview) · [Backend integration](https://surveyjs.io/documentation/backend-integration) · [src/schemas/leads.ts](../src/schemas/leads.ts)

### Page titles on the progress bar

The bar names each page, and `navigationTitle` gives two of them a shorter label there — "Account", "Qualification" — while the page heading keeps the full title.

[progressBarShowPageTitles](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#progressBarShowPageTitles) · [navigationTitle](https://surveyjs.io/form-library/documentation/api-reference/page-model#navigationTitle) · [src/schemas/leads.ts](../src/schemas/leads.ts)

### Expressions over a dynamic panel and matrices

Line totals, discounts, the deal value and the stage-weighted value are all expressions over the current answers.

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Dynamic panel](https://surveyjs.io/form-library/documentation/api-reference/dynamic-panel-model) · [Dynamic matrix](https://surveyjs.io/form-library/documentation/api-reference/dynamic-matrix-table-question-model) · [Expressions in a dynamic panel (example)](https://surveyjs.io/form-library/examples/how-to-use-expressions-in-dynamic-panel/reactjs) · [Expression totals (example)](https://surveyjs.io/form-library/examples/expression-question-for-dynamic-form-calculations/reactjs) · [Adding rows to a dynamic matrix (example)](https://surveyjs.io/form-library/examples/dynamic-matrix-add-new-rows/reactjs) · [src/schemas/leads.ts](../src/schemas/leads.ts)

### New-record defaults from the session

`newRecord` sets a new lead's owner and currency from the signed-in user in code, so opening an old lead as somebody else never rewrites them.

[Survey data model](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model) · [Auto-populating fields (example)](https://surveyjs.io/form-library/examples/auto-populate-form-fields/reactjs) · [src/schemas/collections/leads.ts](../src/schemas/collections/leads.ts)

### Mapped columns plus the document

`toColumns` derives seven values from each record — five the list shows, plus the currency the money column reads and the expected close it sorts by.

[Storing survey results](https://surveyjs.io/form-library/documentation/how-to-store-survey-results) · [Saving and restoring responses (example)](https://surveyjs.io/form-library/examples/save-and-restore-user-responses-to-complete-survey/reactjs) · [src/schemas/collections/leads.ts](../src/schemas/collections/leads.ts)

### Choices from your API *(coming)*

The owner dropdown still reads a static list in the schema file.

[choicesByUrl](https://surveyjs.io/form-library/documentation/api-reference/choicesrestful) · [Choices from a REST service (example)](https://surveyjs.io/form-library/examples/dropdown-menu-load-data-from-restful-service/reactjs)

### An async validator calling the server *(coming)*

No question here asks the server whether an answer is acceptable while it is typed.

[Custom validators](https://surveyjs.io/form-library/documentation/data-validation#implement-custom-client-side-validation) · [Async validation (example)](https://surveyjs.io/form-library/examples/javascript-async-form-validation/reactjs)

### Live updates with presence *(coming)*

The row ids and the no-accumulating-totals rule are here so that two people on one lead can be added without a rewrite.

<!-- edition: full -->
### PDF export

Save as PDF turns the open lead into a document with the answers in it.

[PDF Generator](https://surveyjs.io/pdf-generator/documentation/overview) · [PDF Generator for React](https://surveyjs.io/pdf-generator/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Dashboard (View analytics)

View analytics charts the stored leads from the same definition.

[Dashboard](https://surveyjs.io/dashboard/documentation/overview) · [Dashboard for React](https://surveyjs.io/dashboard/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Survey Creator (Open in Creator)

The header's editor button opens this definition in the drag-and-drop designer.

[Survey Creator](https://surveyjs.io/survey-creator/documentation/overview) · [Survey Creator for React](https://surveyjs.io/survey-creator/documentation/get-started-react)
<!-- /edition -->

## Source files

- [src/app/(shell)/leads/page.tsx](<../src/app/(shell)/leads/page.tsx>)
- [src/app/(shell)/leads/[id]/page.tsx](<../src/app/(shell)/leads/[id]/page.tsx>)
- [src/schemas/leads.ts](../src/schemas/leads.ts)
- [src/schemas/collections/leads.ts](../src/schemas/collections/leads.ts)
- [src/schemas/variables/leads.ts](../src/schemas/variables/leads.ts)
- [src/components/records/RecordsView.tsx](../src/components/records/RecordsView.tsx)
- [src/storage/survey-results.ts](../src/storage/survey-results.ts)
- [src/lib/checks/check-response.ts](../src/lib/checks/check-response.ts)

## What your server does

- [Know who the page is rendered for](https://surveyjs.io/documentation/backend-integration#user-authentication-and-authorization)
- [Load the form definition](https://surveyjs.io/documentation/backend-integration#rest-api)
- [List the stored records](https://surveyjs.io/documentation/backend-integration#survey-data-storage)
- [Read one stored record](https://surveyjs.io/documentation/backend-integration#survey-data-storage)
- [Check it before storing it](https://surveyjs.io/documentation/backend-integration#data-validation-and-sanitization)
- [Store a response](https://surveyjs.io/documentation/backend-integration#survey-data-storage)
