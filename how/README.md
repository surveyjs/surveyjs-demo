# How it's built — the explainers

One file per example. Everything a `/x/how` page says about its example is in the
file named after its route: `/leads` → `leads.md`, `/embedded/chart` →
`embedded-chart.md`. The server reads the file at build time and builds the page
from it (`src/lib/how-content.ts`), so editing a sentence here and rebuilding
changes that page and nothing else.

This file is not an example and the loader ignores it.

You do not need to know TypeScript to edit any of this, and what you write
renders the same on GitHub as on the page.

## Front matter

Two keys, and no others:

```markdown
---
nav: leads
summary: A CRM opportunity as one form: contacts in a dynamic panel, line items and totals in matrices, and rules that follow the signed-in user.
---
```

`nav` is the sidebar row's id. `summary` is one sentence, **200 characters at
most** — it is the page's meta description, its lead paragraph and its card on
`/how`, so it is the one string with a cap.

There is no `# heading` in the file: the page writes `<Label> — how it's built`
from the sidebar row, so renaming the row renames the page.

## The body

Ordinary GitHub-flavoured Markdown. Headings start at `##`; raw HTML is not
rendered. The sections we use, in this order, are **Data in**, **What the
definition reads**, **Data out**, **Features**, **Source files** and **What your
server does** — a convention, not something the parser enforces. A feature is an
`###` heading, and `*(coming)*` after it is the whole of the status vocabulary:
it is prose, nothing parses it.

## Links

Three kinds, told apart by where they point:

| Written as | Means | Renders as |
|---|---|---|
| `[src/schemas/leads.ts](../src/schemas/leads.ts)` | a file in this repository, **relative to this directory** | a monospace link into this edition's repository, new tab |
| `[/leads](/leads)` | a route in this application | a plain link, same tab |
| `[Variables](https://surveyjs.io/…)` | documentation or a live example | a link with ↗, new tab |

A path with brackets or parentheses needs the pointy-bracket form, or Markdown
mis-reads it: `[…](<../src/app/(shell)/leads/page.tsx>)`.

Anything external must be `https://` on an allow-listed host — `surveyjs.io`
today. Extend the list in `e2e/how-integrity.spec.ts`, with the reason, rather
than quietly.

## Quoting what the code says

A fenced block may quote the definition the example ships. Write the text out —
the file has to read whole here and on GitHub — and name what it is on the fence:

````markdown
```json definition=budgetAmount.visibleIf
{budgetConfirmed} = true and {user_role} = 'manager'
```
````

`definition=<element>.<property>`. The element is the nearest enclosing `name`
(`(survey)` at the top, `lineItems › discountPct` inside a matrix); the property
is what sits on it (`visibleIf`, `title.es`, `maskSettings.pattern`). It splits
at the **first** dot, so an element name may never contain one. The test fails
when the text differs from what the shipped definition really has there — drift
is a red build, not a wrong page.

For the two examples that render no fixed form, quote a line of source instead:

````markdown
```ts file=src/lib/lint/lint-survey.ts
const result = lintSurveyJson(json, { ... });
```
````

`file=` takes a **repository path**, not a relative one, and the test fails
unless the block's text occurs verbatim in that file.

## Editions

Wrap what only one edition ships. The markers are HTML comments, so they are
invisible in a Markdown preview, which is the point:

```markdown
<!-- edition: full -->
### PDF export

Save as PDF turns the open lead into a document with the answers in it.
<!-- /edition -->
```

In the edition that has it, the markers simply go. In the other one the block
keeps its words, loses its repository links — those files are not in this
repository — and gains a badge linking the same explainer on the other edition's
host. A feature the reader cannot have is a link across, never a gap.

Blocks do not nest and wrap whole paragraphs or sections, never part of a line.
An unclosed or nested marker fails the test.

## What is missing

```markdown
<!-- TODO: nobody has decided whether the starter should show a remote choice list -->
```

on a line of its own, where a sentence nobody has written would go. It renders as
nothing; the test counts and prints each one and **passes**. Never filler prose,
never an invented URL — an absent link is just an absent link.

## Adding one

Create `<route-with-dashes>.md`, give it the two front-matter keys, and add
`src/app/(shell)/<route>/how/page.tsx` — three lines around `HowPage`. Every
sidebar page needs a file and every file a sidebar page, and
`e2e/how-integrity.spec.ts` fails without one.
