# Survey test cases

Behaviour tests for the form definitions in `src/schemas`, written for `survey-core/tester`. **Nothing in this repository runs them yet.** The tester was published in `survey-core` 3.0.4, but no script, route or spec calls it so far, so these files are inert data.

## Layout

- One case file per schema, named `<schema-id>.tests.json`, where `<schema-id>` is the `id` in that schema's `SchemaDefinition`. `checkout.tests.json` tests `src/schemas/checkout.ts`.
- A case file is a suite: a list of tests, plus the suite-level `starts`, `options` and `variables` they share. It holds nothing else.
- **The definition is not in the file.** It is passed as a separate argument, so the same suite runs against the shipped definition or an edited one, such as the one `/configure` saves:

  ```ts
  import { runSurveyTests } from "survey-core/tester";

  const result = await runSurveyTests(getSchemaDefinition("checkout").json, checkoutTests);
  ```

- Hand-written JSON, with no imports and no comments (JSON has none). Describe a test with its `name` and `description` fields.

## The format

The authoritative specification is the tester's own README, in the SurveyJS library source at [`packages/survey-core/src/tester/README.md`](https://github.com/surveyjs/survey-library/blob/master/packages/survey-core/src/tester/README.md). It defines the step grammar, the commands, the checks and how `starts`, `options` and `variables` merge. It is not restated here, so the two cannot drift apart. The TypeScript shape is `ISurveyTests`, exported from `survey-core/tester`.

`checkout.tests.json` has been run by hand against `survey-core/tester` 3.0.4, and all 4 tests and 15 checks passed.
