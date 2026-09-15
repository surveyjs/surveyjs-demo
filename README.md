# SurveyJS in your app — Full edition

A working application with SurveyJS forms inside it. Not a form gallery: every page is a situation a product team recognises — records your staff edit, a survey embedded in somebody else's site, a clinician's workspace that is nothing but a form, paper job sheets turned into data by AI — and on top of that, the commercial components: your users edit the forms in Survey Creator, every form exports as PDF, and every form is its own dashboard.

**[Run the demo](https://demos.surveyjs.io)** · [MIT edition](https://mit.demos.surveyjs.io) (the same app with MIT-licensed packages only) · [What you can build](https://surveyjs.io/use-cases) · [Server integration](https://surveyjs.io/backend-integration/examples)

## Quick start

```bash
git clone https://github.com/surveyjs/surveyjs-demo.git
cd surveyjs-demo
npm i
npm run dev
```

Open http://localhost:3000.

Survey Creator, Dashboard and PDF Generator are commercial products. Copy `.env.example` to `.env` and put your key in `NEXTJS_PUBLIC_SLK`; it is applied in [src/lib/surveyjs-license.ts](src/lib/surveyjs-license.ts). Without a key they still run, with a watermark or a banner. [Licensing](https://surveyjs.io/licensing) · [free trial](https://surveyjs.io/licensing#trial).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsurveyjs%2Fsurveyjs-demo)

Built with Next.js (App Router) and styled with [shadcn/ui](https://ui.shadcn.com) through the SurveyJS theme adapter — one import, and the same definitions run on any SurveyJS UI package.

## Relationship to the MIT edition

This repository is a **downstream of [surveyjs-demo-mit](https://github.com/surveyjs/surveyjs-demo-mit)**. The application, the forms, the pages and the storage layer are the same code, merged from there. What is added here is the implementation of the extension points that ship as no-ops in the MIT edition — the designer, PDF export, the dashboard and the licence key — under [src/features/full/](src/features/full/) and the files listed in its allowlist.

Practical consequence: if you are looking for the app itself, either repository shows it. If you are starting your own project and don't need the commercial components, start from the MIT one.

## Pages

| Route | What it shows |
| --- | --- |
| `/leads` | A CRM opportunity record: contacts as a dynamic panel, line items and a security-review checklist as dynamic matrices, totals and a qualification score as expressions. One form views, edits and creates; saving writes both your columns and the full response. |
| `/work-orders` | Field service job sheets. Upload a scan or a photo of a filled sheet and the extractor returns a draft record to check on screen; saving prints the answers back onto the company's own job sheet, box by box. |
| `/feedback` | A satisfaction survey in the hero of a mock product site, rendered for the signed-in account: it greets them by name, arrives pre-answered where the account already knows something, and adds or drops whole pages by plan. |
| `/encounter-note` | A clinician's workspace that is only a survey — eight pages, a problem list with detail rows and duplicate detection, a medication matrix that totals daily dose, an exam grid whose rows are generated from what was flagged abnormal, calculated scores, camera capture, a signed attestation. The React component around it is a header bar. |
| `/appointment` | A mock clinic site whose appointment request arrives filled in from the patient's chart, derives the copay from the plan and the visit type, flags an HMO referral, and updates the summary beside it as the patient answers. English and Spanish from one definition. |
| `/starter` | A multi-step checkout form and nothing else. The smallest page here, and the place to start reading. |
| `/definition` | The form as a JSON document: a Monaco editor with survey-core's linter under it on the left, the form it produces on the right. |
| `/<form>/customize` | Survey Creator, opened on one form: designer, JSON editor, logic overview, live preview and theme editor. |
| `/<form>/analytics` | SurveyJS Dashboard for that form, on responses generated from its own definition. |
| `/api/extract` | POST a document and a `formId`; answers come back keyed by question name. Needs an LLM key — see [Environment](#environment). |

The embedded pages (`/feedback`, `/encounter-note`, `/appointment`) render without the admin chrome, each in its own brand, and each outlines what SurveyJS drew with a dashed ring so there is no argument about which part of the page is the library. They share one toolbar: *Open in Creator* opens this form's definition, and what is saved there is what these pages render; *Save as PDF* downloads the form with the answers so far; *Analytics* opens its charts; *Login as* switches between the preset users; *Edit the user* opens the signed-in account in a popup — an editor that is itself a SurveyJS survey, so the library edits its own input.

## What to look at first

- **Forms are JSON, never React.** Definitions live in [src/schemas/](src/schemas/); no page hardcodes a field. [createSurveyModel](src/schemas/createSurveyModel.ts) turns a definition into a configured `survey-core` model and knows nothing about React.
- **One designer for every form.** [CreatorPane](src/components/configure/CreatorPane.tsx) is Survey Creator itself, not a page built around it: `?form=` says which form, the primary button opens the page the form actually lives in, and `isAutoSave` writes through `saveSurveyFunc` as edits happen. `onSurveyInstanceCreated` publishes the demo's first preset user as the `user` variable, so `{user.firstName}` resolves in the Preview tab exactly as it does on the site.
- **The designer needs no theme of its own.** Survey Creator emits the same `.sjs-theme-overrides` root the form does, so the shadcn adapter loaded for the form re-themes the designer, toolbox, tabs and property grid too, and `preferredColorPalette` keeps its chrome in step with the light/dark toggle.
- **The same definition as a dashboard.** [DashboardPane](src/components/analytics/DashboardPane.tsx) hands `survey.getAllQuestions()` to SurveyJS Dashboard, which picks a visualization per question type, aggregates, cross-filters and filters by date. Nothing maps a question to a chart by hand. The responses are **generated from the definition** — a seeded generator, a few hundred rows, skewed so the charts have a shape — so editing a form in the Creator moves its dashboard with it and there is no 20,000-line fixture in the repository.
- **The same definition as a PDF.** [exportSurveyToPdf](src/lib/pdf-export.ts) passes `model.toJSON()` and `model.data` to PDF Generator, so the document is the form as it stands: no print layout, no export mapping. `survey-pdf` is imported on demand, so it costs the page nothing until somebody asks for a file.
- **Paper in, paper out.** `/work-orders` reads a filled sheet with the MIT-licensed [AI Form Response Extractor](https://github.com/surveyjs/ai-form-response-extractor), handing it the file *and the form's own JSON*; each question carries an `aiHint`, the per-field note appended to the prompt that no visitor sees. Tuning those lines, not code, is how extraction is made to land field for field. The other direction prints the record onto the company's blank with pdf-lib, the mapping being one object of coordinates next to the answers it places.
- **One variable does the personalisation.** The host passes the signed-in user (or the patient chart, or the record) as a variable; the definition reads it in titles, in `defaultValueExpression` and in `visibleIf`. Sign in as somebody else and the greeting, the prefilled values and the number of pages all change, with no branching in the application code.
- **Two files touch stored data.** See below.

## Storage: `localStorage` here, your database in production

Everything this app stores goes through **two files in [src/storage/](src/storage/)**. Nothing else in `src/` reads or writes stored data.

| File | What it stores | How the demo does it |
| --- | --- | --- |
| [survey-json.ts](src/storage/survey-json.ts) | Definitions edited in the Creator | `localStorage`, so a visitor's experiments stay in their own browser and the server keeps rendering the definition that ships |
| [survey-results.ts](src/storage/survey-results.ts) | Submitted answers, lead and work-order records | An in-memory array — an edit is gone on reload. Nothing is persisted, on purpose: a demo should not look like it stores someone's data when it does not |

Every function in both files is `async`, so replacing the bodies with calls to your API changes no call site.

### Moving to your own server and database

1. **Tables:** `survey_schemas (id, json, updated_at)` plus one per record type — `leads`, `work_orders`. Seed them from `src/schemas/`.
2. **Route handlers** under `src/app/api/`: `GET`/`PUT`/`DELETE /api/schemas/[id]`, `GET`/`POST /api/leads`, `PUT`/`DELETE /api/leads/[id]`, and the same for work orders. Validate the incoming JSON and authorize the caller here — the Creator is an admin surface, and it is only safe unauthenticated today because nothing leaves the browser.
3. **Replace the bodies in [survey-json.ts](src/storage/survey-json.ts)** — `loadSurveyJson`, `saveSurveyJson`, `resetSurveyJson`. In the Creator that means `saveSurveyFunc` posts to your endpoint instead of writing to `localStorage`.
4. **Replace the bodies in [survey-results.ts](src/storage/survey-results.ts)** — `listResults`, `saveResult`, `deleteResult`, `submitResult`. The dashboard then reads real responses instead of generated ones.
5. **Mind the server-side reader.** `listResults()` is called from a server component, so a relative `fetch("/api/leads")` does not resolve there. Query the database directly in that branch, or use an absolute URL.

[Server integration](https://surveyjs.io/backend-integration/examples) shows the same endpoints for Node.js, ASP.NET Core, PHP and Python, including running validation, linting, PDF generation and extraction on the server.

### What happens to `src/schemas/`

| | |
| --- | --- |
| The form definitions | **Move to the database** — one row each in `survey_schemas`. Keep the files as the seed and as the fallback `loadSurveyJson` returns when a row is missing. |
| `data/*-seed.ts` records | **Move to the database** for the record types; the rest is demo data behind "Prefill demo data" — delete it. |
| `clinic-info.ts`, `patient-record.ts` | The demo clinic's directory, plans and chart — not survey definitions. Delete them with the demos or replace them with your own catalogue. |
| `types.ts`, `createSurveyModel.ts` | **Stay as they are.** |
| `index.ts` | Stays, smaller. `getSchemaDefinition` becomes the fallback rather than the source of truth. |
| `navigation.ts` | **Stays** if your set of forms is fixed. If users create forms at runtime, this moves to the database too and the routes become a single dynamic `/[formId]`. |

## Project structure

Everything outside `src/features/full/` and the files listed in the allowlist is merged from the MIT edition and should be changed there, not here.

```
src/
  app/
    (shell)/                    Pages inside the admin chrome
      leads/  work-orders/  starter/  definition/
    embedded/                   The embedded demos — no admin chrome
      feedback/  encounter-note/  appointment/
    api/extract/                Document → answers
  schemas/                      Definitions, seed data, navigation, model factory
  components/
    SurveyForm.tsx              Renders a model with survey-react-ui
    AdminShell.tsx, Sidebar.tsx, TopBar.tsx, ThemeSwitcher.tsx
    configure/CreatorPane.tsx   Survey Creator, opened on one form        ← Full only
    analytics/DashboardPane.tsx SurveyJS Dashboard for one form           ← Full only
    definition/                 JSON editor + linter
    records/                    Extraction from paper: samples and upload
    embedded/                   One folder per demo, plus what they share
    ui/                         shadcn/ui primitives
  features/
    full/                       Implementations of the extension points   ← Full only
  analytics/                    The seeded response generator             ← Full only
  lib/
    pdf-export.ts               One call into PDF Generator               ← Full only
    work-order-pdf.ts           A record printed onto the company's sheet
    surveyjs-license.ts         Applies the licence key                   ← Full only
  storage/                      The only two files that touch stored data
  styles/                       App-local overrides on top of the adapter
```

## Environment

Copy [.env.example](.env.example) to `.env` — it is git-ignored, so your keys stay out of the repository.

| Variable | What it does |
| --- | --- |
| `NEXTJS_PUBLIC_SLK` | SurveyJS licence key for Creator, Dashboard and PDF Generator. Without it they work but show a banner or a watermark. |
| `OPENAI_API_KEY` | Enables `/api/extract` through OpenAI. |
| `ANTHROPIC_API_KEY` | Enables `/api/extract` through Anthropic. Used when no OpenAI key is set. |
| `EXTRACTOR_MODEL` | Overrides the model (defaults: `gpt-4o`, `claude-sonnet-5`). |
| `NEXT_PUBLIC_SITE_URL` | Base URL used for canonical and Open Graph tags. |

Extraction needs one provider key, not both; if both are set, OpenAI is used. With no key the endpoint answers 501 and the buttons say so. Keys are read on the server only and never reach the browser.

## Tests

Playwright end-to-end tests live in [e2e/](e2e/) and assert, among other things, that the survey markup is present in the server response.

```bash
npm run e2e:ci    # against a production build
npm run e2e:dev   # against `next dev`, where React reports more warnings
npm run e2e:ui    # interactive runner
```

## License

Survey Creator, Dashboard and PDF Generator are commercial — see [SurveyJS licensing](https://surveyjs.io/licensing) and [LICENSE](LICENSE). `survey-core`, `survey-react-ui` and the AI Form Response Extractor are MIT; the application code is the same as in the [MIT edition](https://github.com/surveyjs/surveyjs-demo-mit).
