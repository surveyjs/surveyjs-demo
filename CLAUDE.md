# SurveyJS + Next.js template — full edition

This repository is a **downstream** of [surveyjs-nextjs-demo-mit](https://github.com/surveyjs/surveyjs-nextjs-demo-mit). It is the same application plus the three commercial SurveyJS products: Survey Creator, PDF Generator and Dashboard.

Read that repository's `CLAUDE.md` for the application itself — the routes, the schemas, the storage seams, how to add a page. Everything it says is true here.

## What may be edited here

Every path **not** listed in `scripts/allowlist.txt` is a byte-for-byte copy of the MIT edition at the commit recorded in `.mit-base`. Editing one of those files is not a mistake the tooling can forgive: the next sync overwrites it. Shared code is edited in the MIT edition.

Allowlisted today (see `scripts/allowlist.txt` for the file that actually decides):

- `package.json`, `package-lock.json`, `LICENSE`, `README.md`, `CLAUDE.md`, `.env.example`, `.mit-base`
- `scripts/**` — the sync tooling and its two lists
- `src/features/index.ts` and `src/features/full/**` — the edition config and its implementations
- `src/components/configure/CreatorPane.tsx`, `src/components/configure/SurveyDesigner.tsx` — Survey Creator
- `src/lib/pdf-export.ts`, `src/lib/surveyjs-license.ts` — PDF Generator and the license key
- `src/app/analytics/**`, `src/analytics/**`, `src/components/analytics/**` — Dashboard
- `e2e/creator.spec.ts`, `e2e/analytics.spec.ts`, `e2e/warm-dev-routes.ts`

`scripts/mit-only.txt` is the other side of the same coin: paths that exist in the MIT edition and are intentionally absent here, so the sync never copies them and the check never asks for them.

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

`apply` refuses to run over uncommitted changes to managed files, and never commits.

## Checking

```
node scripts/mit-sync.mjs check
```

It fails, listing every managed path that differs from `mit/main`: `A` only here, `M` edited here, `D` deleted here. It runs in CI too — add the remote first, and make sure the checkout is not shallow.

## Adding a commercial feature

Do not add it to a shared component here. Add the hook to `src/features` in the MIT edition, with a default that renders nothing, commit it there, sync, then implement it in `src/features/index.ts` and `src/features/full/` here.
