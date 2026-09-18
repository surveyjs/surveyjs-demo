import type { ILintFinding } from "survey-core/linter";
import { runSurveyTests, type ISurveyTests } from "survey-core/tester";
import { getVariablePresets } from "@/schemas/variables";
import { getSurveyTests } from "@/schemas/tests";
import type { SurveyJSON } from "@/schemas/types";
import { lintSurveyJson } from "@/lib/lint/lint-survey";

/**
 * Is this definition storable?
 *
 * Two questions, in order of cost, and the second is only asked of a definition
 * that survived the first:
 *
 *  1. **Does it lint?** The same `survey-core/linter` rules the author saw while
 *     they were typing, with the same template suppressions and the form's own
 *     variable presets. Only `error` findings block: an author who has just added
 *     an empty panel has not broken the form, and `page/empty` is a `warning`.
 *     `/api/lint` keeps its stricter `ok` — "no finding at all" is what makes the
 *     status bar say "all checks passed" — because it advises and this decides.
 *  2. **Does it still do what its suite says it does?** `survey-core/tester` runs
 *     the form's cases against the definition that is about to be stored. A form
 *     with no suite passes this step; one suite exists so far.
 *
 * survey-core only, so a route, a script and a spec all call it.
 */

/** Which of the two steps refused it. */
export type DefinitionCheck = "lint" | "tests";

export interface DefinitionFailure {
  readonly message: string;
  /** The rule and the path for a finding; the test, its step and its check for a case. */
  readonly where: string;
  /**
   * The finding's own JSON path, when it has one, so the editor can select it
   * without reading a path back out of a sentence. A failed test has none: it is
   * about what the definition does, not about a node of it.
   */
  readonly path?: string;
}

export interface CheckDefinitionResult {
  readonly ok: boolean;
  readonly check?: DefinitionCheck;
  readonly first?: DefinitionFailure;
  /** How many findings, or how many failed checks and issues. */
  readonly count: number;
}

/**
 * How long the suite may take. The tester's own `asyncTimeout` bounds one
 * operation; this bounds the whole run, because a definition a visitor wrote can
 * ask for work the case's author never imagined. The checkout suite takes about
 * 100 ms, so five seconds is a wide margin and still a bounded request.
 */
export const DEFAULT_TESTS_TIMEOUT_MS = 5_000;

/** One operation inside a case. The tester's own default is the same number. */
const ASYNC_TIMEOUT_MS = 5_000;

/**
 * The moment every run is pinned to. A case that reads `today()` must give the
 * same verdict on every machine and at any hour, and the tester pins the clock
 * to the model rather than to the process, so concurrent requests do not see
 * each other's. This is the tester's own default, written down so that changing
 * it is a decision rather than an upgrade.
 */
const PINNED_NOW = "2024-01-01T00:00:00";

/** Only an `error` stops a save. See the doc comment. */
function blocking(findings: readonly ILintFinding[]): readonly ILintFinding[] {
  return findings.filter((finding) => finding.severity === "error");
}

/** A finding's place: the rule that produced it, and the path it points at. */
function findingWhere(finding: ILintFinding): string {
  return finding.path ? `${finding.ruleId}, ${finding.path}` : finding.ruleId;
}

export async function checkDefinition(
  schemaId: string,
  json: SurveyJSON,
): Promise<CheckDefinitionResult> {
  const presets = getVariablePresets(schemaId);
  const { findings } = lintSurveyJson(json, presets ? { variablePresets: presets } : {});
  const errors = blocking(findings);
  if (errors.length > 0) {
    const [first] = errors;
    return {
      ok: false,
      check: "lint",
      count: errors.length,
      first: { message: first.message, where: findingWhere(first), path: first.path },
    };
  }

  const suite = getSurveyTests(schemaId);
  if (!suite) return { ok: true, count: 0 };

  return runSuite(schemaId, json, suite, presets);
}

async function runSuite(
  schemaId: string,
  json: SurveyJSON,
  suite: ISurveyTests,
  presets: ReturnType<typeof getVariablePresets>,
): Promise<CheckDefinitionResult> {
  // The suite's own presets win: a case that declares them means them. The form's
  // are handed over only when the suite names none, so a personalized definition
  // is tested with the variables its page really gets.
  const cases: ISurveyTests =
    presets && !suite.variablePresets ? { ...suite, variablePresets: presets } : suite;

  const stop = new AbortController();
  const deadline = setTimeout(() => stop.abort(), DEFAULT_TESTS_TIMEOUT_MS);
  let result;
  try {
    result = await runSurveyTests(
      // The runner clones what it is given per test, but the definition about to
      // be stored is not its to touch at all.
      structuredClone(json),
      cases,
      { now: PINNED_NOW, asyncTimeout: ASYNC_TIMEOUT_MS },
      { signal: stop.signal },
    );
  } finally {
    clearTimeout(deadline);
  }

  if (result.status === "passed") return { ok: true, count: 0 };
  if (result.status === "canceled") {
    return {
      ok: false,
      check: "tests",
      count: 1,
      first: {
        message: `the ${schemaId} tests did not finish in time, so nothing was stored`,
        where: suite.name ?? schemaId,
      },
    };
  }

  const failures = collectFailures(result);
  return {
    ok: false,
    check: "tests",
    count: Math.max(failures.length, 1),
    first: failures[0] ?? {
      message: "the form's tests did not pass",
      where: suite.name ?? schemaId,
    },
  };
}

/**
 * Every failed check and every issue, in the suite's order.
 *
 * The tester reports the two separately and puts both on the step that produced
 * them: a check that ran and disagreed carries `expected` and `actual`, and an
 * issue — an unknown target, a step that could not run — carries a `code` and a
 * message. A question a case names and the definition no longer has is an issue,
 * not a failed check, and it is the one a visitor causes most often.
 */
function collectFailures(result: {
  tests: ReadonlyArray<{
    name: string;
    issues: ReadonlyArray<{ message: string }>;
    steps: ReadonlyArray<{
      index: number;
      issues: ReadonlyArray<{ message: string }>;
      checks: ReadonlyArray<{ target: string; check: string; passed: boolean; message?: string }>;
    }>;
  }>;
  issues: ReadonlyArray<{ message: string }>;
}): DefinitionFailure[] {
  const found: DefinitionFailure[] = [];
  for (const test of result.tests) {
    for (const issue of test.issues) {
      found.push({ message: issue.message, where: test.name });
    }
    for (const step of test.steps) {
      for (const issue of step.issues) {
        found.push({ message: issue.message, where: `${test.name}, step ${step.index + 1}` });
      }
      for (const check of step.checks) {
        if (check.passed) continue;
        found.push({
          message: check.message ?? `the "${check.check}" of "${check.target}" is not what the test expects`,
          where: `${test.name}, step ${step.index + 1}, ${check.target}`,
        });
      }
    }
  }
  // A suite-level issue is caused by no node of the case, so it comes last.
  for (const issue of result.issues) found.push({ message: issue.message, where: "the suite" });
  return found;
}
