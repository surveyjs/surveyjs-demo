---
nav: embeddedFeedback
summary: One definition inside a product site's hero, whose pages and questions change shape with the account the host page is rendered for.
---

## Data in

The host page publishes what it knows about its signed-in account as one prefixed variable per field, and the definition reads them.

```ts
const json = await loadSurveyJson("customer-satisfaction") ?? survey.json;
// in the browser, from the active preset:
model.setVariable("user_plan", "business");
```

[src/app/embedded/feedback/page.tsx](../src/app/embedded/feedback/page.tsx)

## What the definition reads

A whole page exists only for an account less than three months old.

```json definition=onboarding.visibleIf
{user_monthsActive} < 3
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic)

How long they have been a customer is derived from the account rather than asked, and re-derives when the account changes.

```json definition=usagePeriod.defaultValueExpression
iif({user_monthsActive} < 1, 'Less than a month', iif({user_monthsActive} < 6, 'One to six months', iif({user_monthsActive} < 12, 'Six months to a year', 'More than a year')))
```

[Expressions](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#expressions) · [Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values)

A calculated value turns the account's plan code into the word the form shows, kept out of the results.

```json definition=planLabel.expression
iif({user_plan} = 'free', 'Free', iif({user_plan} = 'business', 'Business', iif({user_plan} = 'enterprise', 'Enterprise', 'current')))
```

[Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

The relationship page appears for an account with an open ticket or a named success manager, and for nobody else.

```json definition=relationship.visibleIf
{user_openTicket} = true or {user_csmName} notempty
```

[Conditional logic](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

The form asks for an email address only when the account on file has none, which is the host's data deciding the question.

```json definition=contactEmail.requiredIf
{allowFollowUp} = true and {user_email} empty
```

[Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

The survey's own title says the account's first name back to whoever is signed in.

```json definition=(survey).title
Hi {user_firstName}, how are we doing?
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

A question's title can name the plan and the seat count, so the form asks about what this account actually bought.

```json definition=planFit.title
Is the {planLabel} plan the right size for {user_seats} seats?
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Calculated values](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values)

The note above the first question is an HTML element reading the same variables, so nothing about the account is typed twice.

```json definition=accountNote.html
<p>Answering as <strong>{user_firstName} {user_lastName}</strong> — {user_role} at {user_company} · {planLabel} plan · {user_seats} seats.</p>
```

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables)

Every other `{user_…}` reference in this definition is one of those shapes — a page or question that exists for some accounts only, a default derived from the record, a title that says the account's own words back, or a calculated label — and they are all in [src/schemas/customer-satisfaction.ts](../src/schemas/customer-satisfaction.ts).

## Data out

Nothing is posted anywhere: this page is a mock of somebody else's website, so the answers stay in it and drive the toolbar's PDF export.

```ts
<EmbeddedSurvey json={json} onDataChange={trackAnswers} … />
```

[src/components/embedded/shared/EmbeddedSurvey.tsx](../src/components/embedded/shared/EmbeddedSurvey.tsx)

## Features

### Variables from the server

Every field of the signed-in account is published as `user_<field>`, so a variable can never collide with a question of the same name.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [setVariable](https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#setVariable) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/schemas/variables/prefix.ts](../src/schemas/variables/prefix.ts)

### Variable presets

The accounts in the toolbar's **Login as** list are this form's variable presets, which the linter and the editor read too.

[Variables](https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables) · [Custom variables (example)](https://surveyjs.io/form-library/examples/custom-variables-for-background-form-calculations/reactjs) · [src/schemas/variables/cadence.ts](../src/schemas/variables/cadence.ts)

### Themed by the host page

The form takes the host site's own brand colour and type, not this template's.

[Themes and custom styles](https://surveyjs.io/documentation/themes-and-custom-styles) · [The shadcn theme adapter (example)](https://surveyjs.io/form-library/examples/shadcn-theme-adapter/reactjs) · [src/components/embedded/shared/demo-controls.ts](../src/components/embedded/shared/demo-controls.ts)

### Rendered on the server

The definition is read on the server, so the form is in the HTML the host page sends.

[Get started with React](https://surveyjs.io/form-library/documentation/get-started-react) · [src/app/embedded/feedback/page.tsx](../src/app/embedded/feedback/page.tsx)

### One JSON definition, edited from the page header

The toolbar's editor link opens this form's JSON, and what is saved there is what the host page renders.

[Form Library](https://surveyjs.io/form-library/documentation/overview) · [Backend integration](https://surveyjs.io/documentation/backend-integration) · [src/components/embedded/shared/DemoDock.tsx](../src/components/embedded/shared/DemoDock.tsx)

<!-- edition: full -->
### PDF export

Save to PDF in the toolbar turns the form, with whatever has been answered, into a document.

[PDF Generator](https://surveyjs.io/pdf-generator/documentation/overview) · [PDF Generator for React](https://surveyjs.io/pdf-generator/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Dashboard (View analytics)

Analytics in the toolbar charts this form's responses.

[Dashboard](https://surveyjs.io/dashboard/documentation/overview) · [Dashboard for React](https://surveyjs.io/dashboard/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Survey Creator (Open in Creator)

The toolbar's editor link opens the drag-and-drop designer instead of the JSON workbench.

[Survey Creator](https://surveyjs.io/survey-creator/documentation/overview) · [Survey Creator for React](https://surveyjs.io/survey-creator/documentation/get-started-react)
<!-- /edition -->

## Source files

- [src/app/embedded/feedback/page.tsx](../src/app/embedded/feedback/page.tsx)
- [src/components/embedded/feedback/CadenceDemo.tsx](../src/components/embedded/feedback/CadenceDemo.tsx)
- [src/components/embedded/feedback/CadenceSite.tsx](../src/components/embedded/feedback/CadenceSite.tsx)
- [src/components/embedded/shared/useDemo.ts](../src/components/embedded/shared/useDemo.ts)
- [src/schemas/customer-satisfaction.ts](../src/schemas/customer-satisfaction.ts)
- [src/schemas/variables/cadence.ts](../src/schemas/variables/cadence.ts)

## What your server does

- [Load the form definition](https://surveyjs.io/documentation/backend-integration#rest-api)
