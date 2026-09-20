---
nav: starter
summary: A multi-step checkout form and the fifteen lines of page around it: the shape every other page here is an elaboration of.
---

## Data in

The page reads this visitor's definition on the server and hands it to one component, which is the whole of its data flow.

```ts
<SurveyForm
  schema={await loadSurveyJson("checkout") ?? getSchemaDefinition("checkout").json}
  schemaId="checkout"
  prefillData={checkoutSample}
/>
```

[src/app/(shell)/starter/page.tsx](<../src/app/(shell)/starter/page.tsx>)

## What the definition reads

A billing address that was typed and then hidden again by the toggle never reaches the submitted data.

```json definition=(survey).clearInvisibleValues
onComplete
```

[Survey data model](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model) · [Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

The card fields are a panel that exists only while card is the chosen payment method.

```json definition=cardPanel.visibleIf
{paymentMethod} = 'card'
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

The card number is masked by the definition, not by an input handler in the page.

```json definition=cardNumber.maskSettings.pattern
9999 9999 9999 9999
```

[Form Library](https://surveyjs.io/form-library/documentation/overview)

The review step is expressions over the earlier answers, so nothing is copied into it.

```json definition=reviewShipTo.expression
iif({fullName} notempty, {fullName} + ', ' + {city}, '—')
```

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values)

## Data out

Completing the form posts the answers to the submissions route, which owns no records page and checks them the same way.

```http
POST /api/storage/submissions/checkout
{ "data": { "email": "…", "paymentMethod": "card" } }
→ 201
```

[src/app/api/storage/submissions/[schemaId]/route.ts](<../src/app/api/storage/submissions/[schemaId]/route.ts>)

## Features

### A multi-page form, validated page by page

Four pages with a table of contents and a progress bar, each validated before the next one opens.

[Multi-page surveys](https://surveyjs.io/form-library/documentation/design-survey/create-a-multi-page-survey) · [Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [A multi-step wizard (example)](https://surveyjs.io/form-library/examples/multi-step-form-wizard/reactjs) · [src/schemas/checkout.ts](../src/schemas/checkout.ts)

### Rendered on the server

The form markup is in the HTML the server sent, before any JavaScript runs.

[Get started with React](https://surveyjs.io/form-library/documentation/get-started-react) · [src/components/SurveyForm.tsx](../src/components/SurveyForm.tsx)

### Themed by the host page

The form takes the application's shadcn/ui tokens through the SurveyJS theme adapter.

[Themes and custom styles](https://surveyjs.io/documentation/themes-and-custom-styles) · [The shadcn theme adapter (example)](https://surveyjs.io/form-library/examples/shadcn-theme-adapter/reactjs) · [src/styles/survey-overrides-shadcn.css](../src/styles/survey-overrides-shadcn.css)

### Server-side validation

The submissions route runs the same checks the records pages use, and this is the one form with a behaviour suite behind it as well.

[Server-side validation](https://surveyjs.io/form-library/documentation/data-validation#server-side-validation) · [Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [Server-side validation (example)](https://surveyjs.io/form-library/examples/javascript-server-side-form-validation/reactjs) · [src/schemas/tests/checkout.tests.json](../src/schemas/tests/checkout.tests.json)

### Behaviour tests for a definition

`checkout.tests.json` runs against any definition somebody tries to store for this form, after the linter and before the write.

[src/schemas/tests/index.ts](../src/schemas/tests/index.ts)

### One JSON definition, edited from the page header

The header's editor button opens this same definition, and what is saved there is what this page renders.

[Form Library](https://surveyjs.io/form-library/documentation/overview) · [Backend integration](https://surveyjs.io/documentation/backend-integration) · [src/components/PageHeader.tsx](../src/components/PageHeader.tsx)

### Choices from your API *(coming)*

<!-- TODO: Nobody has decided whether the starter should show a remote choice list at all -->

[choicesByUrl](https://surveyjs.io/form-library/documentation/api-reference/choicesrestful) · [Choices from a REST service (example)](https://surveyjs.io/form-library/examples/dropdown-menu-load-data-from-restful-service/reactjs)

<!-- edition: full -->
### PDF export

Save as PDF sits in the survey's own navigation bar and turns the answers so far into a document.

[PDF Generator](https://surveyjs.io/pdf-generator/documentation/overview) · [PDF Generator for React](https://surveyjs.io/pdf-generator/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Dashboard (View analytics)

View analytics charts the submissions this page collects.

[Dashboard](https://surveyjs.io/dashboard/documentation/overview) · [Dashboard for React](https://surveyjs.io/dashboard/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Survey Creator (Open in Creator)

The header's editor button opens the drag-and-drop designer instead of the JSON workbench.

[Survey Creator](https://surveyjs.io/survey-creator/documentation/overview) · [Survey Creator for React](https://surveyjs.io/survey-creator/documentation/get-started-react)
<!-- /edition -->

## Source files

- [src/app/(shell)/starter/page.tsx](<../src/app/(shell)/starter/page.tsx>)
- [src/schemas/checkout.ts](../src/schemas/checkout.ts)
- [src/schemas/data/checkout-seed.ts](../src/schemas/data/checkout-seed.ts)
- [src/schemas/tests/checkout.tests.json](../src/schemas/tests/checkout.tests.json)
- [src/components/SurveyForm.tsx](../src/components/SurveyForm.tsx)
- [src/app/api/storage/submissions/[schemaId]/route.ts](<../src/app/api/storage/submissions/[schemaId]/route.ts>)

## What your server does

- [Load the form definition](https://surveyjs.io/documentation/backend-integration#rest-api)
- [Check it before storing it](https://surveyjs.io/documentation/backend-integration#data-validation-and-sanitization)
- [Store a response](https://surveyjs.io/documentation/backend-integration#survey-data-storage)
