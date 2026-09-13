# SurveyJS + Next.js template — full edition

This repository is a **downstream** of [surveyjs-nextjs-demo-mit](https://github.com/surveyjs/surveyjs-nextjs-demo-mit). It is the same application plus the three commercial SurveyJS products: Survey Creator, PDF Generator and Dashboard.

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

`package.json` is allowlisted but not free: it must be the MIT edition's plus `survey-creator-core`, `survey-creator-react`, `survey-pdf` and `survey-analytics`, with identical `devDependencies` and `scripts`. The check prints a warning for anything else.

`scripts/mit-only.txt` is the other side of the same coin: paths that exist in the MIT edition and are intentionally absent here, so the sync never copies them and the check never asks for them. It lists only `scripts/check-mit-pure.mjs`. This edition is a **superset** of the MIT one: the JSON workbench, the lint front end over Monaco and their specs are copied here like everything else, no route here uses them, and `e2e/configure.spec.ts` and `e2e/lint.spec.ts` skip themselves in this edition.

The files the full edition implements still live at their historical paths, not under `src/features/full/` — `src/lib/surveyjs-license.ts` is one of them, and it is shared: the MIT edition carries the same file and never calls it.

## Syncing

The two repositories have **unrelated git histories** on purpose. Never merge or rebase one onto the other; the sync is a copy.

Once per clone:

```
git remote add mit https://github.com/surveyjs/surveyjs-nextjs-demo-mit
git fetch mit
```

Then, whenever the MIT edition moves:

```
node scripts/mit-sync.mjs apply --dry-run   # what would change
node scripts/mit-sync.mjs apply             # copy, then check
git add -A && git commit -m "sync from mit@<sha>"
```

`apply` fetches `mit` itself, so no separate `git fetch` is needed. It copies every managed path from `mit/main`, deletes every tracked managed path that no longer exists there, writes the MIT commit to `.mit-base`, then runs the check. `--dry-run` does not fetch and changes nothing. `apply` refuses to run over uncommitted changes to managed files, and never commits.

After a sync that changes dependencies, reconcile `package.json` by hand and run `npm install`. There is no lock file: `.npmrc` (from the MIT edition) sets `package-lock=false`, because every SurveyJS package is pinned to `latest`.

## Checking

```
node scripts/mit-sync.mjs check              # fetches mit first
node scripts/mit-sync.mjs check --no-fetch   # against the mit/main already fetched
```

It fails, listing every managed path in the working tree that differs from `mit/main`: `A` only here, `M` edited here, `D` deleted here. `package.json` differences are printed as warnings and do not fail it. It runs in CI too — add the remote first, and make sure the checkout is not shallow.

## Environment

`.env.example` arrives from the MIT edition and documents every key; copy it to `.env.local`. The one that matters here is `SURVEYJS_KEY`, the SurveyJS license key: when it is set, `src/lib/surveyjs-license.ts` applies it, and it unlocks Survey Creator, the PDF generator and the dashboard. Without it those three still run, and mark their output. See `.env.example` for the rest.

## Adding a commercial feature

Do not add it to a shared component here. Add the hook to `src/features` in the MIT edition, with a default that renders nothing, commit it there, sync, then implement it in `src/features/index.ts` and `src/features/full/` here.
