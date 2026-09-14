# SurveyJS + Next.js example

This example shows how to use Next.js along with the [SurveyJS Form Library](https://surveyjs.io/form-library/documentation/overview) and [Survey Creator](https://surveyjs.io/survey-creator/documentation/overview): complex forms are defined as JSON, edited in the visual designer, rendered on the server by the App Router, and styled with [shadcn/ui](https://ui.shadcn.com) through the SurveyJS theme adapter.

Survey Creator is a commercial product. Put your license key in `SURVEYJS_KEY` (copy `.env.example` to `.env`) — it is applied in [src/lib/surveyjs-license.ts](src/lib/surveyjs-license.ts); without it the designer shows a watermark.

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsurveyjs%2Fsurveyjs-demo)

## How to use

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/), or [pnpm](https://pnpm.io) to bootstrap the example:

```bash
npx create-next-app --example "https://github.com/surveyjs/surveyjs-demo" surveyjs-nextjs-app
```

```bash
yarn create next-app --example "https://github.com/surveyjs/surveyjs-demo" surveyjs-nextjs-app
```

```bash
pnpm create next-app --example "https://github.com/surveyjs/surveyjs-demo" surveyjs-nextjs-app
```

Or clone the repository directly:

```bash
git clone https://github.com/surveyjs/surveyjs-demo.git
cd surveyjs-demo
npm i
npm run dev
```

Open http://localhost:3000/ in your browser.

Deploy it to the cloud with [Vercel](https://vercel.com/new?utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).

## What this example covers

- **Server-side rendering.** A survey is rendered into the HTML the server sends, so the form is in the document before any JavaScript runs — no DOM stub or other workaround required.
- **JSON-driven forms.** Every form is a plain JSON definition; the app never hardcodes fields. Definitions live in [src/schemas/](src/schemas/).
- **A renderer-agnostic model factory.** [createSurveyModel](src/schemas/createSurveyModel.ts) builds a configured `survey-core` model from a definition, and knows nothing about React — the same call works with any SurveyJS UI package.
- **Theming with shadcn/ui.** The SurveyJS shadcn adapter (`survey-core/themes/adapters/shadcn-base-nova.css`) maps the form onto the same design tokens the rest of the app uses, so light/dark mode and radius/color changes apply to both at once. App-local tweaks go into [src/styles/](src/styles/). Survey Creator is themed by the same adapter and needs no adapter of its own: it emits the same `.sjs-theme-overrides` root the form does, so loading the form adapter on `/configure` re-themes the designer, toolbox, tabs and property grid too — and `preferredColorPalette` keeps its chrome in step with the header light/dark toggle.
- **Create, edit and read-only modes.** [src/components/ClaimsView.tsx](src/components/ClaimsView.tsx) lists stored records, adds one filled from a document, and reuses the same definition to display or edit an existing record.
- **One designer for every form.** [`/configure`](src/components/configure/CreatorPane.tsx) is Survey Creator, opened on one form: designer, JSON editor, logic overview, live preview and theme editor, all of it the product rather than a page built around it. It carries no chrome of its own — `?form=` says which form is being edited, and a reviewer arrives from that form and leaves back to it — and the primary button opens the page the form actually lives in, which for the embedded demos is somebody else’s website. `isAutoSave` writes through `saveSurveyFunc` as edits happen, into `localStorage`, so the server keeps rendering the canonical definition and the prerendered HTML stays intact.
  - A personalized definition is previewed for somebody: `onSurveyInstanceCreated` publishes the demo's first preset user as the `user` variable, so `{user.firstName}` resolves in the Preview tab exactly as it does on the site.
- **The same definition as a dashboard.** [`/analytics?form=…`](src/components/analytics/DashboardPane.tsx) is SurveyJS Dashboard: `questions: survey.getAllQuestions()` hands it the schema, and it picks a visualization per question type, offers the alternatives in each item’s menu, aggregates, cross-filters when you click a bar, and filters by date. Nothing here maps a question to a chart by hand — the few overrides in [demo-responses.ts](src/analytics/demo-responses.ts) exist because an NPS rating deserves the NPS visualizer.
  - The responses are **generated from the definition** (a seeded generator, a few hundred rows, skewed so the charts have a shape) rather than shipped as a fixture: edit a form in the Creator and its dashboard follows, and there is no 20,000-line data file in the repository.
- **The same definition as a PDF.** “Save as PDF” sits in the survey’s own navigation bar, next to Prefill: [exportSurveyToPdf](src/lib/pdf-export.ts) passes `model.toJSON()` and `model.data` to SurveyJS PDF Generator, so the document is the form as it stands — no print layout, no export mapping. `survey-pdf` is imported on demand, so it costs the page nothing until somebody asks for a file.
- **…and the claim onto the real form.** A questionnaire is the wrong document for a claim, so `/claims` exports the other direction: [exportClaimToCms1500](src/lib/cms1500-pdf.ts) prints the record onto the CMS-1500 (02/12) sheet itself, box for box, over the blank in [public/samples](public/samples/) with pdf-lib. The same JSON is read from paper by the extractor and printed back onto it — the mapping table is one object of coordinates, next to the answers it places.
- **A way in from paper.** A claim on `/claims` can be filled from a document instead of typed: [`/api/extract`](src/app/api/extract/route.ts) hands the file *and this form’s own JSON* to the MIT-licensed [AI Form Response Extractor](https://github.com/surveyjs/ai-form-response-extractor), and the answers are stored as a draft claim and opened on screen for a person to check — with the real validation and the real conditional logic. Two documents ship in [public/samples](public/samples/) and sit under the list as thumbnails: the **same** CMS-1500, once as a digital PDF and once as a scan, so the mapping can be seen on both kinds of input in one click. Any other CMS-1500 can be uploaded beside them. The key is server-side only; see [Environment](#environment).
- **The survey is the extraction schema.** [insurance-claim.ts](src/schemas/insurance-claim.ts) is the CMS-1500 (02/12) box by box, and every question carries an `aiHint` — the per-field note the extractor appends to the prompt and no visitor ever sees. That is where the form’s quirks are written down: which side of its label a checkbox sits on, that box 14 is not the date of birth, that money is printed as dollars and cents in two columns, that the two boxes with identical wording hold different insurers. Tuning those lines, rather than any code, is how extraction is made to land field for field.
- **Surveys embedded in somebody else’s site.** Three demos under [`/embedded`](src/app/embedded/), each rendered without the admin chrome (see the `(shell)` route group), each in its own brand colour, and each opened in a new tab from the sidebar. One host site, one form, sitting inline in the page the way a real embed does.

  They share one toolbar, and it is deliberately down to two claims. **The form is JSON:** *Configure JSON* opens this form’s definition on `/configure`, and what is saved there is what these pages render — the round trip a buyer is asking about, rather than a second editor bolted onto the host site. **The form is a document and a dashboard:** *PDF* downloads it with the answers so far, *Analytics* opens the charts for it. **The form is rendered for a person:** *Login as* switches between the three preset users each demo ships with, and *Edit the user* opens the signed-in account in a popup — and that editor is itself a SurveyJS survey, with the object it produces shown as JSON underneath it, so the library is editing its own input and there is no bespoke form code anywhere. Every demo passes that object to survey-core as one variable, so the definition reads `{user.firstName}` — in titles, in `defaultValueExpression` to arrive pre-answered, and in `visibleIf` to add or drop whole pages. Sign in as somebody else and the greeting, the values *and* the number of steps change. And the form is outlined wherever it lands — the dashed ring is always on, so there is no argument about which part of the page SurveyJS drew and which part is the host site. See [demo-accounts.ts](src/components/embedded/shared/demo-accounts.ts); the shared machinery is [useDemo](src/components/embedded/shared/useDemo.ts), so the next demo is a page component and a route.
  - `/embedded/feedback` — a mock product marketing site whose hero holds a satisfaction survey, addressed to the workspace member who is signed in. It greets them by name, works out how long they have been a customer from `monthsActive` rather than asking, gives a paying customer a question about plan fit and a three-week-old account a whole onboarding page instead, quotes their open support ticket by subject, names their CSM if they have one, and never asks for an email address it already has.
  - `/embedded/chart` — the staff side of that same clinic, and the answer to *our real forms are nothing like that*. The whole screen is one survey: eight pages with survey-core’s own table of contents and progress bar, a problem list as a dynamic matrix with expandable detail rows and duplicate detection, a medication matrix that totals daily dose and morphine-milligram equivalents in its total row, surgical history as a tabbed dynamic panel with a file upload per operation, a focused-exam grid whose **rows are generated** from the systems flagged abnormal (`rowsVisibleIf`), BMI / mean arterial pressure / a PHQ-2 score / a cardiovascular risk band in `expression` questions and `calculatedValues`, three triggers, camera capture, a signature-pad attestation and a review step before the note is filed. [ChartDemo.tsx](src/components/embedded/chart/ChartDemo.tsx) is a header bar and nothing else — that is the point: none of the above is React. And the note is still rendered *for* somebody: open a different chart in the toolbar and the banner, the age, the clinician, the problem and medication lists and the new-patient page all follow the patient.
  - `/embedded/clinic` — a mock US primary-care site, built to the conventions a patient reads without noticing: the utility bar, a provider directory with credentials, in-network plans, posted self-pay prices, the statutory notices. Its appointment request answers the question patients actually ask — [visitSummaryFor](src/schemas/clinic-info.ts) derives the copay from the plan and the visit type, flags an HMO referral, and builds the what-to-bring list; submitting scrolls to the clinician who will see them. And because a patient portal knows more about you than any other login you have, it is the sharpest of the three on personalisation: the office, the clinician, the plan, the name and the date of birth all arrive filled in, the identity fields stay locked until the patient says something has changed, the insurance-card fields are not there at all while a card is on file, “is this about something we already treat you for?” offers *that patient’s* conditions and the refill question *that patient’s* medications — both assembled choice by choice from the chart — and a first-time visitor gets an extra page nobody else sees.
- **One place to swap in your own storage.** Every read and write goes through two files in [src/storage/](src/storage/), and nothing else in the app knows where the data lives — see [Storage](#storage-localstorage-here-your-database-in-production).

## Storage: `localStorage` here, your database in production

Everything this template stores goes through **two files in [src/storage/](src/storage/)**. Nothing else in `src/` reads or writes stored data.

| File | What it stores | How the demo does it |
| --- | --- | --- |
| [survey-json.ts](src/storage/survey-json.ts) | Survey definitions edited on `/configure` | `localStorage`, so each visitor's experiments stay in their own browser and the server keeps rendering the definition that ships with the template |
| [survey-results.ts](src/storage/survey-results.ts) | Submitted answers and the claim records | An in-memory array — an edit is gone as soon as you reload. Nothing is persisted, on purpose: a template should not look like it stores someone's data when it does not |

Every function in both files is `async`, so replacing the bodies with calls to your API changes no call site anywhere else.

### Moving to your own server and database

1. **Two tables:** `survey_schemas (id, json, updated_at)` and `claims (id, data, updated_at)`. Seed them from `src/schemas/` (see below).
2. **Route handlers** under `src/app/api/` — `GET`/`PUT`/`DELETE /api/schemas/[id]`, and `GET`/`POST /api/claims` plus `PUT`/`DELETE /api/claims/[id]`. Validate the incoming JSON and authorize the caller here: the schema editor is effectively an admin surface, and it is only safe unauthenticated today because nothing leaves the browser.
3. **Replace the three bodies in [survey-json.ts](src/storage/survey-json.ts)** — `loadSurveyJson`, `saveSurveyJson`, `resetSurveyJson` — with `fetch` calls. The file's header comment shows the shape.
4. **Replace the four bodies in [survey-results.ts](src/storage/survey-results.ts)** — `listResults`, `saveResult`, `deleteResult`, `submitResult`.
5. **Mind the one server-side reader.** `listResults()` is called from the `/claims` server component, so the table and the form are in the server HTML; a relative `fetch("/api/claims")` does not resolve there. Query the database directly in that branch, or use an absolute URL. The three mutations run on the client and can use relative URLs.

### What happens to `src/schemas/`

The folder holds four different kinds of thing, and only the first moves into the database:

| | |
| --- | --- |
| `checkout.ts`, `insurance-claim.ts`, `plan-finder.ts`, `customer-satisfaction.ts`, `encounter-note.ts`, `clinic-visit.ts` | **Move to the database** — one row each in `survey_schemas`. Keep the files as the seed, and as the fallback `loadSurveyJson` returns to when a row is missing. |
| `data/insurance-claim-seed.ts` | **Moves to the database** — rows in `claims`. |
| `data/checkout-seed.ts`, `data/plan-finder-seed.ts`, `data/customer-satisfaction-seed.ts`, `data/encounter-note-seed.ts`, `data/clinic-visit-seed.ts` | Demo data behind the "Prefill demo data" button. Delete them. |
| `clinic-info.ts` | The demo clinic’s own directory, plans and derived visit summary, not a survey definition. Delete it with the demos, or replace it with whatever your real catalogue is. |
| `types.ts`, `createSurveyModel.ts` | **Stay as they are.** Types and the model factory have nothing to do with storage. |
| `index.ts` | Stays, smaller. `getSchemaDefinition` becomes the fallback path rather than the source of truth, since definitions now come from `loadSurveyJson`. |
| `navigation.ts` | **Stays** if your set of forms is fixed. If users create forms at runtime, this moves to the database too and the routes become a single dynamic `/[formId]`. |

One matching change in the pages: the editor currently takes `getSchemaDefinition(id).json` from [forms.ts](src/components/configure/forms.ts), and the form pages pass it as `schema`. Both become `(await loadSurveyJson(id)) ?? getSchemaDefinition(id).json`.

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Redirects to `/leads`. |
| `/leads` | Placeholder: CRM records, one form to view, edit and add. Says plainly that it is not built yet, and lists what it will demonstrate. |
| `/claims` | Table of CMS-1500 claim records; view one read-only, edit it, or add one already filled in from a sample document under the list. The claim form is the paper form box by box: masked input, dropdowns, radio groups, dates, numbers, a six-row service table and conditional panels. |
| `/starter` | A checkout form and nothing else — table of contents, required-field validation, input masks, panels gated by `visibleIf`, and a review page built from earlier answers via `{question}` piping. |
| `/definition?form=…` | Any form in the template as JSON, with the linter under it and the form it produces beside it, inside the admin shell. |
| `/embedded/feedback` | Embedded demo — a mock product site whose hero hosts a satisfaction survey, rendered for the signed-in account. |
| `/embedded/chart` | Embedded demo — a clinician’s workspace that is nothing but the survey: eight pages, matrices with totals and detail rows, calculated scores, file and camera capture, a signed attestation. |
| `/embedded/clinic` | Embedded demo — a US clinic site whose appointment request arrives filled in from the patient’s chart, estimates the copay and flags a needed referral. |
| `/configure?form=…` | Survey Creator, opened on one form: designer, JSON, logic, preview and theme. No sidebar. |
| `/analytics?form=…` | SurveyJS Dashboard for one form, on generated responses. No sidebar. |
| `/api/extract` | POST a document plus a `formId`; answers come back keyed by question name. Needs an LLM key. |
| Legacy redirects | `/records` → `/claims`, `/checkout` → `/starter`, `/checkout/configure` → `/configure?form=checkout`, `/records/configure` and `/claims/configure` → `/configure?form=insurance-claim`. Temporary (307), in `next.config.mjs`. |

## Project structure

```
src/
  app/
    (shell)/                    Pages inside the admin chrome, one folder per route
    embedded/                   The embedded demos — no admin chrome at all
      feedback/  chart/  clinic/
  schemas/
    types.ts                    Shared types (survey-core only, no UI framework)
    createSurveyModel.ts        Model factory
    checkout.ts                 The six form definitions
    insurance-claim.ts
    plan-finder.ts
    customer-satisfaction.ts
    encounter-note.ts           The clinician’s note — the heaviest definition here
    clinic-visit.ts
    clinic-info.ts              The clinic’s directory, plans, and the derived visit summary
    patient-record.ts           The patient chart the clinic demo renders its form for
    data/                       Demo response data / seed records
    navigation.ts               The sidebar groups: pages, links and the schema each page renders
  components/
    SurveyForm.tsx              Renders a model with survey-react-ui
    ClaimsView.tsx              Claims table + add / view / edit a record
    NotImplemented.tsx          The panel of a page that is not built yet
    AdminShell.tsx, Sidebar.tsx, ThemeSwitcher.tsx
    configure/                  Survey Creator, opened on one form
      CreatorPane.tsx           The designer itself, client-only
      forms.ts                  Every form in the template, in one list
    analytics/                  SurveyJS Dashboard for one form
    claims/                     Extraction from paper: the sample documents and the upload
    embedded/                   One folder per demo route, plus what they share
      shared/                   The toolbar, the user popup, the survey wrapper, the demo accounts
      feedback/  clinic/  chart/
    ui/                         shadcn/ui primitives
  storage/                      The only two files that touch stored data
    survey-json.ts              Survey definitions
    survey-results.ts           Submitted answers and claim records
  analytics/
    demo-responses.ts           Generates the responses the dashboard is drawn from
  lib/
    pdf-export.ts               One call into SurveyJS PDF Generator
    cms1500-pdf.ts              A claim printed onto the paper CMS-1500
    surveyjs-license.ts         Applies the license key
    utils.ts                    The shadcn class-merging helper
  styles/                       App-local overrides on top of the SurveyJS adapter
```

To add a form, drop a JSON definition into `src/schemas/`, register it in [src/schemas/index.ts](src/schemas/index.ts), add an entry to [src/schemas/navigation.ts](src/schemas/navigation.ts) and one to [src/components/configure/forms.ts](src/components/configure/forms.ts) so the designer covers it, and create a page that passes it to `SurveyForm`.

## Environment

Copy [.env.example](.env.example) to `.env` and fill in what you need — `.env` is git-ignored, so your keys stay out of the repository.

| Variable | What it does |
| --- | --- |
| `SURVEYJS_KEY` | SurveyJS license key for Creator, Dashboard and PDF Generator. Without it they work but show an alert banner or a watermark. Applied in [surveyjs-license.ts](src/lib/surveyjs-license.ts). |
| `OPENAI_API_KEY` | Enables `/api/extract` through OpenAI. |
| `ANTHROPIC_API_KEY` | Enables `/api/extract` through Anthropic. Used when no OpenAI key is set. |
| `EXTRACTOR_MODEL` | Overrides the model (defaults: `gpt-4o`, `claude-sonnet-5`). |

Extraction needs one of the two provider keys, not both: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. If both are set, OpenAI is the one used.

With no LLM key the extraction endpoint answers 501 and the buttons on `/claims` say so: the feature is wired, and it starts working the moment a key appears. The keys are read on the server only and never reach the browser.

## Tests

Playwright end-to-end tests live in [e2e/](e2e/) and assert, among other things, that the survey markup is present in the server response.

```bash
npm run e2e:ci    # against a production build
npm run e2e:dev   # against `next dev`, where React reports more warnings
npm run e2e:ui    # interactive runner
```

## Relation to the MIT edition

This repository is a downstream of [surveyjs-demo-mit](https://github.com/surveyjs/surveyjs-demo-mit), the same application with `survey-core` and `survey-react-ui` only. This edition adds Survey Creator, PDF Generator and Dashboard.

Shared code is synchronized from the MIT edition and is not edited here. A change to it is made there and copied over, and a check fails if a shared file differs. See [CLAUDE.md](CLAUDE.md) for the allowlist of files this edition owns and for the sync command.

## License

[SurveyJS licensing](https://surveyjs.io/licensing) — see [LICENSE](LICENSE). `survey-pdf` and `survey-analytics` are installed but not wired into any page yet.
