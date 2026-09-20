---
nav: embeddedChart
summary: The largest form in the template, rendered as an internal workspace: the patient's chart decides which of its eight pages exist.
---

## Data in

The chart that is open is published as variables, and the note is built around them before the clinician types anything.

```ts
const json = await loadSurveyJson("encounter-note") ?? survey.json;
// the open chart, flattened one variable per field:
{ user_dateOfBirth: "1979-04-02", user_conditions: ["asthma"], … }
```

[src/app/embedded/chart/page.tsx](../src/app/embedded/chart/page.tsx)

## What the definition reads

The age at the top of the note is computed from the chart's date of birth, never stored.

```json definition=patientAge.expression
age({user_dateOfBirth})
```

[Custom functions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#custom-functions) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

The interpreter question exists only for a patient whose chart asks for one.

```json definition=interpreterPresent.visibleIf
{user_needsInterpreter} = true
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

Height and weight give a BMI and a classification without a line of React.

```json definition=bmi.expression
round({weightLb} * 703 / ({heightIn} * {heightIn}), 1)
```

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values)

The opioid load of the note is summed over the medications matrix as a calculated value, so nothing accumulates a stale total.

```json definition=noteMme.expression
round(sumInArray({medications}, 'dailyMme'), 0)
```

[Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values) · [Dynamic matrix](https://surveyjs.io/form-library/documentation/api-reference/dynamic-matrix-table-question-model)

A red flag among the answers opens the escalation question in the same pass.

```json definition=escalateToday.visibleIf
{redFlags} notempty and {redFlags} notcontains 'none'
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

The note is titled after the patient whose chart is open, before the clinician types anything.

```json definition=(survey).title
Encounter note — {user_lastName}, {user_firstName}
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

Each problem on the chart is one choice with its own condition, so the list a clinician sees is the list that patient has.

```json definition=chartProblems.visibleIf
{user_conditions} contains 'asthma'
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

The provider and the site the visit is filed under are defaults off the chart, not questions.

```json definition=renderingProvider.defaultValueExpression
{user_primaryProvider}
```

[Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

A whole page leaves the table of contents for a patient this practice has seen before.

```json definition=baselinePage.visibleIf
{user_isNewPatient} = true
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

Every other `{user_…}` reference in this definition is one of those shapes, and they are all in [src/schemas/encounter-note.ts](../src/schemas/encounter-note.ts).

## Data out

Nothing is posted anywhere: this page is a mock of an internal system, so the finished note stays in the browser.

```ts
<EmbeddedSurvey json={json} onDataChange={trackAnswers} … />
```

[src/components/embedded/shared/EmbeddedSurvey.tsx](../src/components/embedded/shared/EmbeddedSurvey.tsx)

## Features

### Expressions over a dynamic panel and matrices

Vitals averages, scores, counts and the medication totals are all expressions and calculated values over the current answers.

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Dynamic panel](https://surveyjs.io/form-library/documentation/api-reference/dynamic-panel-model) · [Dynamic matrix](https://surveyjs.io/form-library/documentation/api-reference/dynamic-matrix-table-question-model) · [Expressions in a dynamic panel (example)](https://surveyjs.io/form-library/examples/how-to-use-expressions-in-dynamic-panel/reactjs) · [Expression totals (example)](https://surveyjs.io/form-library/examples/expression-question-for-dynamic-form-calculations/reactjs) · [Adding rows to a dynamic matrix (example)](https://surveyjs.io/form-library/examples/dynamic-matrix-add-new-rows/reactjs) · [src/schemas/encounter-note.ts](../src/schemas/encounter-note.ts)

### Triggers that write an answer

Three triggers write an answer the clinician did not type: escalate a visit, flag a blood pressure, flag an opioid total.

[Triggers](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#conditional-survey-logic-triggers) · [Conditional logic and branching (example)](https://surveyjs.io/form-library/examples/conditional-logic-and-branching-in-surveys/reactjs) · [src/schemas/encounter-note.ts](../src/schemas/encounter-note.ts)

### Variables from the server

Conditions and medications on the chart become choice-level visibility, one `visibleIf` per choice, so the same definition asks a different set of questions per patient.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [setVariable](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#setVariable) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/schemas/variables/patient.ts](../src/schemas/variables/patient.ts)

### Variable presets

The charts the toolbar opens are this form's presets, built from the patient record rather than copied.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/schemas/patient-record.ts](../src/schemas/patient-record.ts)

### A multi-page form, validated page by page

Eight pages with the survey's own table of contents, some of which exist for one patient and not another.

[Multi-page surveys](https://surveyjs.io/form-library/documentation/design-survey/create-a-multi-page-survey) · [Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [A multi-step wizard (example)](https://surveyjs.io/form-library/examples/multi-step-form-wizard/reactjs) · [src/schemas/encounter-note.ts](../src/schemas/encounter-note.ts)

### A signature that a completed record needs

The note is signed on a signature pad question at the end of it.

[Signature pad](https://surveyjs.io/form-library/documentation/api-reference/signature-pad-model) · [Signature pad (example)](https://surveyjs.io/form-library/examples/signature-pad-widget-javascript/reactjs) · [src/schemas/encounter-note.ts](../src/schemas/encounter-note.ts)

### Rendered on the server

The definition is read on the server, so this eight-page note is in the first HTML response.

[Get started with React](https://surveyjs.io/form-library/documentation/get-started-react) · [src/app/embedded/chart/page.tsx](../src/app/embedded/chart/page.tsx)

<!-- edition: full -->
### PDF export

Save to PDF in the toolbar turns the whole note into a document.

[PDF Generator](https://surveyjs.io/pdf-generator/documentation/overview) · [PDF Generator for React](https://surveyjs.io/pdf-generator/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Dashboard (View analytics)

Analytics in the toolbar charts the scores and vitals this note collects.

[Dashboard](https://surveyjs.io/dashboard/documentation/overview) · [Dashboard for React](https://surveyjs.io/dashboard/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Survey Creator (Open in Creator)

The toolbar's editor link opens the drag-and-drop designer instead of the JSON workbench.

[Survey Creator](https://surveyjs.io/survey-creator/documentation/overview) · [Survey Creator for React](https://surveyjs.io/survey-creator/documentation/get-started-react)
<!-- /edition -->

## Source files

- [src/app/embedded/chart/page.tsx](../src/app/embedded/chart/page.tsx)
- [src/components/embedded/chart/ChartDemo.tsx](../src/components/embedded/chart/ChartDemo.tsx)
- [src/components/embedded/shared/useDemo.ts](../src/components/embedded/shared/useDemo.ts)
- [src/schemas/encounter-note.ts](../src/schemas/encounter-note.ts)
- [src/schemas/patient-record.ts](../src/schemas/patient-record.ts)
- [src/schemas/variables/patient.ts](../src/schemas/variables/patient.ts)

## What your server does

- [Load the form definition](https://surveyjs.io/documentation/backend-integration#rest-api)
