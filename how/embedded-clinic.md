---
nav: embeddedClinic
summary: One bilingual definition whose answers update the visit summary, the copay and the referral notice on the page around it.
---

## Data in

The patient's portal record arrives as variables, and the language of the whole page is decided by it before any JavaScript runs.

```ts
const json = await loadSurveyJson("clinic-visit") ?? survey.json;
// the patient's portal record, and the locale it asks for:
chartLocale(patient.preferredLanguage) // "es" | "en"
```

[src/app/embedded/clinic/page.tsx](../src/app/embedded/clinic/page.tsx)

## What the definition reads

Every patient-facing string is a localized object in the definition itself, which is how `survey-core` stores one.

```json definition=(survey).title.es
Solicitar una cita
```

[Survey localization](https://surveyjs.io/form-library/documentation/survey-localization)

A returning patient and a new one are greeted by two different elements of one definition.

```json definition=returningGreeting.visibleIf
{user_isNewPatient} = false
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

The question about an existing condition exists only for a chart that has one on it.

```json definition=relatedToChart.visibleIf
{user_conditions} notempty
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

A refill is offered only to a patient whose record says refills are available.

```json definition=refillNeeded.visibleIf
{user_openRefills} = true
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

What is going on is asked only where the reason for the visit makes it worth asking.

```json definition=symptoms.visibleIf
{visitReason} anyof ['illness', 'urgentCare'] or {relatedToChart} = true
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

The identity fields are filled from the portal record rather than asked again.

```json definition=firstName.defaultValueExpression
{user_firstName}
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values)

They are read-only until a returning patient says the record is wrong, which is one expression rather than a mode in the page.

```json definition=firstName.enableIf
{user_isNewPatient} = true or {identityCorrect} = false
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

Each medication on the record is one choice with its own condition, so a refill can only be asked for something the patient is actually on.

```json definition=refillMedications.visibleIf
{user_medications} contains 'albuterol'
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

The insurance card on file is shown back in both languages, from one localized element.

```json definition=cardOnFileNote.html.es
<p>Tenemos su tarjeta de <strong>{healthPlanLabel}</strong> en el expediente: número de miembro {user_memberIdOnFile}, grupo {user_groupNumberOnFile}. No tiene que escribir nada, a menos que haya cambiado.</p>
```

[Survey localization](https://surveyjs.io/form-library/documentation/survey-localization) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

Every other `{user_…}` reference in this definition is one of those shapes, and they are all in [src/schemas/clinic-visit.ts](../src/schemas/clinic-visit.ts).

## Data out

Nothing is posted anywhere: the answers drive the panel beside the form, which is the host site reading the survey rather than the other way round.

```ts
visitSummaryFor(data, account, locale)
// → { reason, clinician, copay, referralWarning, whatToBring }
```

[src/schemas/clinic-info.ts](../src/schemas/clinic-info.ts)

## Features

### One definition, two languages

Spanish is rendered on the server from the chart, and the EN/ES switch is an override keyed to the patient and the chart's own language.

[Survey localization](https://surveyjs.io/form-library/documentation/survey-localization) · [Survey localization (example)](https://surveyjs.io/form-library/examples/survey-localization/reactjs) · [src/schemas/clinic-locale.ts](../src/schemas/clinic-locale.ts)

### Variables from the server

The plan, the conditions and the refills on the record decide the copay, the referral warning and half the questions.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [setVariable](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#setVariable) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/schemas/variables/patient.ts](../src/schemas/variables/patient.ts)

### Variable presets

The patients the toolbar signs in as are this form's presets, shared with the encounter note.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/schemas/patient-record.ts](../src/schemas/patient-record.ts)

### Themed by the host page

The form wears the clinic's colours, and its own strings come from the host page's table, not the definition.

[Themes and custom styles](https://surveyjs.io/documentation/themes-and-custom-styles) · [The shadcn theme adapter (example)](https://surveyjs.io/form-library/examples/shadcn-theme-adapter/reactjs) · [src/components/embedded/clinic/ridgeline-strings.ts](../src/components/embedded/clinic/ridgeline-strings.ts)

### Rendered on the server

A Spanish-speaking patient is sent Spanish HTML, not English HTML that swaps itself out.

[Get started with React](https://surveyjs.io/form-library/documentation/get-started-react) · [src/app/embedded/clinic/page.tsx](../src/app/embedded/clinic/page.tsx)

### Expressions over a dynamic panel and matrices

The plan label the summary shows is a calculated value over the record, kept out of the results.

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Dynamic panel](https://surveyjs.io/form-library/documentation/api-reference/dynamic-panel-model) · [Dynamic matrix](https://surveyjs.io/form-library/documentation/api-reference/dynamic-matrix-table-question-model) · [Expressions in a dynamic panel (example)](https://surveyjs.io/form-library/examples/how-to-use-expressions-in-dynamic-panel/reactjs) · [Expression totals (example)](https://surveyjs.io/form-library/examples/expression-question-for-dynamic-form-calculations/reactjs) · [Adding rows to a dynamic matrix (example)](https://surveyjs.io/form-library/examples/dynamic-matrix-add-new-rows/reactjs) · [src/schemas/variables/labels.ts](../src/schemas/variables/labels.ts)

<!-- edition: full -->
### PDF export

Save to PDF in the toolbar turns the request into a document in the language it was filled in.

[PDF Generator](https://surveyjs.io/pdf-generator/documentation/overview) · [PDF Generator for React](https://surveyjs.io/pdf-generator/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Dashboard (View analytics)

Analytics in the toolbar charts the requests this form collects.

[Dashboard](https://surveyjs.io/dashboard/documentation/overview) · [Dashboard for React](https://surveyjs.io/dashboard/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Survey Creator (Open in Creator)

The designer's Translation tab opens this definition's English and Spanish side by side.

[Survey Creator](https://surveyjs.io/survey-creator/documentation/overview) · [Survey Creator for React](https://surveyjs.io/survey-creator/documentation/get-started-react) · [The Translations tab](https://surveyjs.io/survey-creator/documentation/end-user-guide/translations-tab)
<!-- /edition -->

## Source files

- [src/app/embedded/clinic/page.tsx](../src/app/embedded/clinic/page.tsx)
- [src/components/embedded/clinic/RidgelineDemo.tsx](../src/components/embedded/clinic/RidgelineDemo.tsx)
- [src/components/embedded/clinic/RidgelineSite.tsx](../src/components/embedded/clinic/RidgelineSite.tsx)
- [src/components/embedded/clinic/ridgeline-strings.ts](../src/components/embedded/clinic/ridgeline-strings.ts)
- [src/schemas/clinic-visit.ts](../src/schemas/clinic-visit.ts)
- [src/schemas/clinic-info.ts](../src/schemas/clinic-info.ts)
- [src/schemas/clinic-locale.ts](../src/schemas/clinic-locale.ts)
- [src/schemas/variables/patient.ts](../src/schemas/variables/patient.ts)

## What your server does

- [Load the form definition](https://surveyjs.io/documentation/backend-integration#rest-api)
