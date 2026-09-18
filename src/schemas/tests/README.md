# Survey test cases

Behaviour tests for the form definitions in `src/schemas`, written for `survey-core/tester`.

**A suite is part of its form's contract.** `PUT /api/storage/definitions/:schema` runs it against the definition a visitor is trying to store, after the linter and before the write (`src/lib/checks/check-definition.ts`): a definition that lints clean but no longer does what the form does is refused with a 422, naming the test. `e2e/server-checks.spec.ts` runs every suite against the definition that ships.

So writing a file here has a consequence: from then on nobody can store a definition of that form which fails it. That is the point, and it is worth being deliberate about what a case asserts.

## Layout

- One case file per schema, named `<schema-id>.tests.json`, where `<schema-id>` is the `id` in that schema's `SchemaDefinition`. `checkout.tests.json` tests `src/schemas/checkout.ts`.
- **Register it in `index.ts`**, beside the other imports, the way `schemaRegistry` maps an id to a definition. `getSurveyTests(schemaId)` is what the check asks; a form with no file passes the test step, and six of the seven forms have none today.
- A case file is a suite: a list of tests, plus the suite-level `starts`, `options` and `variables` they share. It holds nothing else.
- **The definition is not in the file.** It is passed as a separate argument, so the same suite runs against the shipped definition or an edited one, such as the one `/configure` saves:

  ```ts
  import { runSurveyTests } from "survey-core/tester";

  const result = await runSurveyTests(getSchemaDefinition("checkout").json, checkoutTests);
  ```

- Hand-written JSON, with no imports and no comments (JSON has none). Describe a test with its `name` and `description` fields.

## The format

The authoritative specification is the tester's own README, in the SurveyJS library source at [`packages/survey-core/src/tester/README.md`](https://github.com/surveyjs/survey-library/blob/master/packages/survey-core/src/tester/README.md). It defines the step grammar, the commands, the checks and how `starts`, `options` and `variables` merge. It is not restated here, so the two cannot drift apart. The TypeScript shape is `ISurveyTests`, exported from `survey-core/tester`.

`checkout.tests.json` passes: 4 tests, 15 checks, about 100 ms.
