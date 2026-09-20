---
nav: definition
summary: The developer's view of any form here: the definition as JSON, the rendered result beside it, and static analysis running on every keystroke.
---

## Data in

The workbench takes whichever form the query names, this visitor's copy of its definition, and the variables that form expects to be given.

```ts
const form = getFormEntry(params.get("form"));
const json = await loadSurveyJson(form.id) ?? form.json;
const variablePresets = getVariablePresets(form.id);
```

[src/components/configure/JsonWorkbench.tsx](../src/components/configure/JsonWorkbench.tsx)

## What the code reads

Which form is on screen is a query parameter, so every form here has a URL worth sharing.

```ts file=src/components/configure/JsonWorkbench.tsx
const form = getFormEntry(params.get("form"));
```

[Form Library](https://surveyjs.io/form-library/documentation/overview)

The status bar under the editor calls exactly what the server calls, so the two cannot disagree.

```ts file=src/components/lint/StaticAnalysisBar.tsx
const result = lintSurveyJson(
```

One suppression is declared for a token this template writes on purpose, at its own path, and nothing else is silenced.

```ts file=src/lib/lint/lint-survey.ts
suppress: [...templateSuppressions(json), ...(options.suppress ?? [])],
```

The same rules are a route as well, because a client that skipped this page still meets them.

```ts file=src/app/api/lint/route.ts
export async function POST(request: Request) {
```

[Backend integration](https://surveyjs.io/documentation/backend-integration)

## Data out

Saving stores the definition for this visitor alone, and the route lints it and runs the form's behaviour suite before it writes anything.

```http
PUT /api/storage/definitions/checkout
{ "json": { "pages": [ … ] } }
→ 204, or 422 { "error": "Not saved: …", "check": "lint" | "tests" }
```

[src/app/api/storage/definitions/[schemaId]/route.ts](<../src/app/api/storage/definitions/[schemaId]/route.ts>)

## Features

### Static analysis on every change

`survey-core`'s own linter runs headless on every change and maps each finding back to a line in the editor.

[Form Library](https://surveyjs.io/form-library/documentation/overview) · [src/lib/lint/monaco-adapter.ts](../src/lib/lint/monaco-adapter.ts)

### Behaviour tests for a definition

A definition that lints clean but no longer behaves like the form it claims to be is refused by its own test suite.

[src/lib/checks/check-definition.ts](../src/lib/checks/check-definition.ts)

### Variable presets

A personalized form is linted with the variables its host injects, or every reference to them would be reported as unknown.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/schemas/variables/index.ts](../src/schemas/variables/index.ts)

### One JSON definition, edited from the page header

What is saved here is what every page renders for this visitor, read back on the server.

[Form Library](https://surveyjs.io/form-library/documentation/overview) · [Backend integration](https://surveyjs.io/documentation/backend-integration) · [src/storage/survey-json.ts](../src/storage/survey-json.ts)

### Server-side validation

The route decides and the editor only advises: `/api/lint` answers with findings and stores nothing.

[Server-side validation](https://surveyjs.io/form-library/documentation/data-validation#server-side-validation) · [Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [Server-side validation (example)](https://surveyjs.io/form-library/examples/javascript-server-side-form-validation/reactjs) · [src/lib/checks/messages.ts](../src/lib/checks/messages.ts)

<!-- edition: full -->
### Survey Creator (Open in Creator)

The full edition replaces the chrome-less /configure route with the drag-and-drop designer, and keeps this page's Monaco view as it is.

[Survey Creator](https://surveyjs.io/survey-creator/documentation/overview) · [Survey Creator for React](https://surveyjs.io/survey-creator/documentation/get-started-react) · [Saving and loading a schema](https://surveyjs.io/survey-creator/documentation/get-started-react#save-and-load-survey-model-schemas) · [src/app/configure/page.tsx](../src/app/configure/page.tsx) · [src/components/configure/CreatorPane.tsx](../src/components/configure/CreatorPane.tsx) · [src/components/configure/SurveyDesigner.tsx](../src/components/configure/SurveyDesigner.tsx)
<!-- /edition -->

## Source files

- [src/app/(shell)/definition/page.tsx](<../src/app/(shell)/definition/page.tsx>)
- [src/app/configure/page.tsx](../src/app/configure/page.tsx)
- [src/components/configure/JsonWorkbench.tsx](../src/components/configure/JsonWorkbench.tsx)
- [src/components/configure/forms.ts](../src/components/configure/forms.ts)
- [src/components/lint/StaticAnalysisBar.tsx](../src/components/lint/StaticAnalysisBar.tsx)
- [src/lib/lint/lint-survey.ts](../src/lib/lint/lint-survey.ts)
- [src/lib/checks/check-definition.ts](../src/lib/checks/check-definition.ts)
- [src/app/api/lint/route.ts](../src/app/api/lint/route.ts)

## What your server does

- [Load the form definition](https://surveyjs.io/documentation/backend-integration#rest-api)
- [Check it before storing it](https://surveyjs.io/documentation/backend-integration#data-validation-and-sanitization)
- [Store an edited definition](https://surveyjs.io/documentation/backend-integration#rest-api)
