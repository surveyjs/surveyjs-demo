# SurveyJS + Next.js template — full edition

This repository is a **downstream** of [surveyjs-demo-mit](https://github.com/surveyjs/surveyjs-demo-mit). It is the same application plus the three commercial SurveyJS products: Survey Creator, PDF Generator and Dashboard.

Read that repository's `CLAUDE.md` for the application itself — the routes, the schemas, the storage seams, how to add a page. Everything it says is true here.

## What may be edited here

Every path **not** listed in `scripts/allowlist.txt` is a byte-for-byte copy of the MIT edition at the commit recorded in `.mit-base`. Editing one of those files is not a mistake the tooling can forgive: the next sync overwrites it. Shared code is edited in the MIT edition.

Allowlisted today (see `scripts/allowlist.txt` for the file that actually decides):

- `package.json`, `LICENSE`, `README.md`, `CLAUDE.md`, `.mit-base`
- `scripts/allowlist.txt`, `scripts/mit-only.txt`, `scripts/mit-sync.mjs` — the sync tooling and its two lists
- `azure-pipelines.yml` — internal CI, not part of the template; the two pipelines may differ freely
- `src/features/index.ts` and `src/features/full/**` — the edition config and its implementations
- `src/app/configure/page.tsx`, `src/components/configure/CreatorPane.tsx`, `src/components/configure/SurveyDesigner.tsx` — Survey Creator on `/configure`
- `src/lib/pdf-export.ts` — PDF Generator
- `src/app/analytics/**`, `src/analytics/**`, `src/components/analytics/**` — Dashboard
- `e2e/creator.spec.ts`, `e2e/analytics.spec.ts`
- `public/samples/work-order-blank.pdf`, `e2e/work-order-pdf.spec.ts` — the job sheet printer's blank and spec; the printer is `src/features/full/work-order-pdf.ts`, wired in as `exportWorkOrderPdf`. The MIT edition has no job sheet PDF, and its `npm run assets:work-order` writes the blank and the box table only where `src/features/full/` exists

`package.json` is allowlisted but not free. Every MIT `dependency` and `devDependency` must be here with the same spec, and `scripts` must be identical, or the check **fails**. The only extras it may carry without comment are `survey-creator-core`, `survey-creator-react`, `survey-pdf` and `survey-analytics`. Any other extra prints a warning.

`scripts/mit-only.txt` is the other side of the same coin: paths that exist in the MIT edition and are intentionally absent here, so the sync never copies them and the check never asks for them. It lists only `scripts/check-mit-pure.mjs`. This edition is a **superset** of the MIT one: the JSON workbench, the lint front end over Monaco and their specs are copied here like everything else, no route here uses them, and `e2e/configure.spec.ts` and `e2e/lint.spec.ts` skip themselves in this edition.

The files the full edition implements still live at their historical paths, not under `src/features/full/` — `src/lib/surveyjs-license.ts` is one of them, and it is shared: the MIT edition carries the same file and never calls it.

## Validation

- **The storage route enforces, and this edition's author meets a finding in a toast.** `PUT /api/storage/definitions/:schema` lints the definition and runs the form's test suite before it stores anything, and answers 422 with the first thing wrong (shared code; see the MIT edition's `CLAUDE.md`, **Validation**). Survey Creator 3.1 still has no lint UI, so until it ships that toast is where an author here first learns a rule was broken — in the MIT edition the status bar under Monaco has already said so while they typed. When Creator gets the rules it will need the form's variable presets and `templateSuppressions` handed to it, and the toast becomes the second place a finding is seen rather than the first.
- **`CreatorPane.tsx` announces a refusal through Creator's own notification.** `instance.notify(message, "error")` is the standard one — the same toast, `.svc-notifier--error`, that `showErrorOnFailedSave` raises — carrying the sentence the server sent instead of the generic "Editor content is not saved". So `showErrorOnFailedSave` is set to `false`: left on, every refused save would show two toasts, and the second would say less than the first. Every failed save is announced this way, a storage refusal (403, 413) included.
- **One toast per error, not one per autosave.** Autosave fires about once a second while somebody types, and the last announced message is kept in a ref: the same refusal is not announced again, and the first save that succeeds clears it. The persistent line under the header stays, because the toast leaves after two seconds and the refusal has not; while a save is refused the header's subtitle says "Not saved" rather than "Saved as you edit", which over a definition the server rejected would be a lie.
- **Autosave stays on.** A refusal costs nothing: the designer keeps the author's work, the definition on the server stays the last good one, and the next clean autosave stores it. Creator's condition editor never commits an expression it cannot parse — `ConditionEditor.apply()` refuses and notifies instead — so a half-typed expression reaches a save only through the JSON tab.
- `e2e/creator.spec.ts` covers the announcement; `e2e/server-checks.spec.ts`, shared, covers what the routes refuse in both editions. `e2e/lint-api.spec.ts`, which posts every form in `FORMS` with its presets, still covers the advisory route.
- Creator edits `aiHint`, the per-question note for the document extractor, as "AI extraction hint" in the property grid, under Description, for the survey and every question (not for matrix columns). It is registered in the shared `src/schemas/custom-properties.ts`; `src/components/configure/CreatorPane.tsx` imports that module for its side effect before building the Creator, so a saved definition keeps every hint. CreatorPane also moves the row under Description itself, because Survey Creator 3.0.4 ignores `nextToProperty` when the anchor is in the same tab.
- `/api/lint` (`src/app/api/lint/route.ts`, `src/lib/lint/lint-survey.ts`) is the shared server route. It is not edited here, and `e2e/lint-api.spec.ts` runs in both editions.
- The Monaco front end (`JsonWorkbench`, `StaticAnalysisBar`, `monaco-adapter.ts`) is copied here and used on one route: `/definition`, the shared shell page that shows any form as JSON with the linter. `/configure` is still Survey Creator.

## Variable presets in Survey Creator

The personalized forms read `{user_…}` variables, declared per form in the shared `src/schemas/variables/` (see the MIT edition's `CLAUDE.md`, **Variable presets**). `CreatorPane.tsx` hands them to the Creator:

- **The option.** The Creator is built per form with `{ ...CREATOR_OPTIONS, variablePresets: structuredClone(getVariablePresets(form.id)) }`. The condition editor then lists the variables, each with the value editor its definition question implies (`user_role` is a dropdown of `sales` and `manager`); the Preview tab gets a preset selector and, because there is a definition, a structured preset editor.
- **The clone.** The preset editor writes the edited list into the host's object in place (`VariablePresetsManager.setPresets`), and the registry's object is a module singleton every page and route shares. Never pass it uncloned.
- **The first preset is active on open.** The Creator's own default is none. `CreatorPane` sets `instance.getPlugin<TabTestPlugin>("preview").variablePresets.active` to the first preset's name, so a reviewer does not meet "Welcome back, !"; "No variables" is one click away in the selector. The header says which preset Preview runs with, kept current by `onVariablePresetsChanged` (whose payload field is `active` in 3.1.0).
- **Edits are session-only.** Presets edited in the Creator live until the page is left, and are not stored. Persisting them would be a storage seam beside `survey-json.ts`.

## Translation in Survey Creator

`CREATOR_OPTIONS` in `CreatorPane.tsx` turns the Translation tab on for **every** form, and turns on `clearTranslationsOnSourceTextChange`.

- **The tab is not per-form, because it does not need to be.** It reads the locales a definition actually uses. Appointment request (`src/schemas/clinic-visit.ts`) is the one that ships bilingual — every patient-facing string is a `{ default, es }` object, which is what survey-core stores a localized string as — so there the tab opens on English and Spanish side by side, and is where those strings are edited from now on. The rest open on English with a language selector, and a locale added there is carried by the same definition, stored by the same autosave.
- **A source-string edit drops the translations.** `clearTranslationsOnSourceTextChange: true` (Creator 2.0.2 and later, and the option a machine-translation setup is built around): change an English title in the designer and the Spanish beside it goes, instead of staying behind as a translation of a sentence that no longer exists, and the Translation tab shows the string as untranslated. That is deliberately the whole application's line on half-translated text — `chartLocale` in the shared `src/schemas/clinic-locale.ts` gives a patient whose chart says `vi` the English form rather than a partly-Spanish one. Creator applies it to a question's `name` and a choice's `value` as well, where the title or the text was only ever the default.
- **Nothing is translated for the author.** "Auto-translate All" is offered only when `onMachineTranslate` has a handler (`getHasMachineTranslation`), and there is none here, so the action is absent altogether; a locale is filled in by hand, or imported from the tab's CSV. Wiring it to a model would be a server seam beside `src/app/api/` — that key stays server-side — not a Creator option.
- `e2e/creator.spec.ts` covers all three, under `the Translation tab`: that the tab opens on the Spanish `clinic-visit` already ships, that a form with no translations gets the language selector and nothing else, and that editing an English title in the designer clears the Spanish for that string and keeps every other one.

## Page metadata

Titles, descriptions, canonicals and social tags come from `src/lib/metadata.ts`, which is shared code (see the MIT edition's `CLAUDE.md`, **Page metadata**). The copy is written once there. This edition's text is chosen by `edition: "full"` in `src/features/index.ts`: no `(MIT)` in the title suffix, and the root description that names the designer, PDF export and dashboards. Do not add strings here. The two allowlisted routes, `src/app/configure/page.tsx` and `src/app/analytics/page.tsx`, call the shared `formToolMetadata`, which titles them "<form's page title> — Customize" and "— Results".

### Canonicals and indexing: an open decision

Both hosts serve the same routes. Every page is canonical to itself on `NEXT_PUBLIC_CANONICAL_URL`, which defaults to `NEXT_PUBLIC_SITE_URL`. `NEXT_PUBLIC_INDEXABLE=false` adds `noindex, follow` and a `robots.txt` that disallows crawling. Nothing sets it to `false` today.

**The site owner has not decided between two options.** The code supports both, and choosing one is a deployment setting, not a code change:

1. **Both editions indexed** (current). Each host is canonical to itself. The descriptions differ meaningfully, and "SurveyJS MIT" is a real query.
2. **This host wins every query.** On the MIT host, set `NEXT_PUBLIC_CANONICAL_URL=https://app.demos.surveyjs.io`, so its canonicals point here. Nothing changes on this host. `/analytics` has no MIT counterpart, so it is unaffected.

## Syncing

The two repositories have **unrelated git histories** on purpose. Never merge or rebase one onto the other; the sync is a copy.

Once per clone:

```
git remote add mit https://github.com/surveyjs/surveyjs-demo-mit
git fetch mit
```

Then, whenever the MIT edition moves:

```
node scripts/mit-sync.mjs apply --dry-run   # what would change
node scripts/mit-sync.mjs apply             # copy, then check
git add -A && git commit -m "sync from mit@<sha>"
```

`apply` fetches `mit` itself, so no separate `git fetch` is needed. It copies every managed path from `mit/main`, deletes every tracked managed path that no longer exists there, writes the MIT commit to `.mit-base`, then runs the check. `--dry-run` does not fetch and changes nothing. `apply` refuses to run over uncommitted changes to managed files, and never commits.

After a sync that changes dependencies, reconcile `package.json` by hand and run `npm install`. There is no lock file: `.npmrc` (from the MIT edition) sets `package-lock=false`, because every SurveyJS package takes a floating `^3.1.1` range.

## Checking

```
node scripts/mit-sync.mjs check              # fetches mit first
node scripts/mit-sync.mjs check --no-fetch   # against the mit/main already fetched
```

It fails, listing every managed path in the working tree that differs from `mit/main`: `A` only here, `M` edited here, `D` deleted here. It also fails on a `package.json` that misses or changes an MIT dependency, or whose `scripts` differ, printing the name and both specs. Extra dependencies other than the four commercial packages are printed as warnings. It runs in CI too — add the remote first, and make sure the checkout is not shallow.

## Environment

`.env.example` arrives from the MIT edition and documents every key; copy it to `.env.local`. The one that matters here is `SURVEYJS_KEY`, the SurveyJS license key: when it is set, `src/lib/surveyjs-license.ts` applies it, and it unlocks Survey Creator, the PDF generator and the dashboard. Without it those three still run, and mark their output. On a deployment, also set `NEXT_PUBLIC_SITE_URL` to this host, or canonicals say `http://localhost:3000`. See `.env.example` for the rest.

## Adding a commercial feature

Do not add it to a shared component here. Add the hook to `src/features` in the MIT edition, with a default that renders nothing, commit it there, sync, then implement it in `src/features/index.ts` and `src/features/full/` here.
