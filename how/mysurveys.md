---
nav: mySurveys
summary: The application many customers build first, shown as itself: your users create forms, run them and read the results.
---

## Data in

The page reads its own sidebar row, and answers 404 in an edition that has none rather than throwing at import time.

```ts
const nav = navPages.find((item) => item.id === "mySurveys");
if (!nav) notFound();
```

[src/app/(shell)/mysurveys/page.tsx](<../src/app/(shell)/mysurveys/page.tsx>)

## What the code reads

A page behind a row only one edition has is still shared code, so it looks its row up instead of demanding one.

```ts file=src/app/(shell)/mysurveys/page.tsx
const nav = navPages.find((item) => item.id === "mySurveys");
```

[Form Library](https://surveyjs.io/form-library/documentation/overview)

Whether a screenshot exists is asked while the page is built, so adding the PNG and rebuilding is the whole change.

```ts file=src/app/(shell)/mysurveys/page.tsx
function hasCapture(file: string): boolean {
```

[Get started with React](https://surveyjs.io/form-library/documentation/get-started-react)

Every word and every frame on the page is data in one React-free module, so its spec asserts what it renders.

```ts file=src/lib/mysurveys.ts
export const MYSURVEYS_SCREENSHOTS: readonly MySurveysScreenshot[] = [
```

[Form Library](https://surveyjs.io/form-library/documentation/overview)

The three places this page can send somebody are constants beside the rest of the site's links.

```ts file=src/lib/mysurveys.ts
const serverIntegration = SITE_LINKS.find((link) => link.id === "serverIntegration")!;
```

[Backend integration examples](https://surveyjs.io/backend-integration/examples)

## Data out

This example stores nothing and renders no form: what comes out of it is the three places it sends you next.

```ts
MYSURVEYS_PATHS.map((item) => item.href)
// → hosted MySurveys, the free builder, the backend examples
```

[src/lib/mysurveys.ts](../src/lib/mysurveys.ts)

## Features

<!-- edition: full -->
### Survey Creator (Open in Creator)

The designer your users build their own forms in is the same one this demo's editor pages open.

[Survey Creator](https://surveyjs.io/survey-creator/documentation/overview) · [Survey Creator for React](https://surveyjs.io/survey-creator/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### Dashboard (View analytics)

The results screen is the same charting library the analytics pages here use.

[Dashboard](https://surveyjs.io/dashboard/documentation/overview) · [Dashboard for React](https://surveyjs.io/dashboard/documentation/get-started-react)
<!-- /edition -->

<!-- edition: full -->
### PDF export

Any response in that application can be taken away as a PDF.

[PDF Generator](https://surveyjs.io/pdf-generator/documentation/overview) · [PDF Generator for React](https://surveyjs.io/pdf-generator/documentation/get-started-react)
<!-- /edition -->

### One JSON definition, edited from the page header

Every form your users create is a JSON document your server stores, exactly as in this template.

[Form Library](https://surveyjs.io/form-library/documentation/overview) · [Backend integration](https://surveyjs.io/documentation/backend-integration) · [src/storage/survey-json.ts](../src/storage/survey-json.ts)

### Server-side validation *(coming)*

<!-- TODO: Nobody has established what the hosted application enforces on a stored definition -->

[Server-side validation](https://surveyjs.io/form-library/documentation/data-validation#server-side-validation) · [Data validation](https://surveyjs.io/form-library/documentation/data-validation) · [Server-side validation (example)](https://surveyjs.io/form-library/examples/javascript-server-side-form-validation/reactjs)

## Source files

- [src/app/(shell)/mysurveys/page.tsx](<../src/app/(shell)/mysurveys/page.tsx>)
- [src/lib/mysurveys.ts](../src/lib/mysurveys.ts)
- [src/schemas/navigation.ts](../src/schemas/navigation.ts)
