import { Serializer } from "survey-core";
import { getRules, lintSurvey } from "survey-core/linter";
import type { ILintFinding, ISuppression, ISurveyLintOptions } from "survey-core/linter";
// `aiHint`, and any other property this template registers: the linter reads the
// same Serializer, so it checks them like survey-core's own.
import "../../schemas/custom-properties";

export type { ILintFinding };

export interface SurveyLintVerdict {
  /** True when no rule reported anything: the same test that makes the editor say "all checks passed". */
  readonly ok: boolean;
  /** Every finding, each naming the rule that produced it in `ruleId`. */
  readonly findings: readonly ILintFinding[];
  /** The ids of every rule that ran, so a caller can say what "ok" was measured against. */
  readonly ruleIds: readonly string[];
  /** Findings this template deliberately silenced; see `templateSuppressions`. */
  readonly suppressedCount: number;
}

/** HTML autofill's section tokens, which the `autocomplete` property's choice list does not spell out. */
const AUTOFILL_SECTION = /^(?:section-[\w-]+\s+)?(?:shipping|billing)\s+(\S+)$/;

/**
 * The one thing this template writes on purpose and the linter cannot know about. It is
 * silenced at its own path, never by switching a rule off, so the same mistake anywhere
 * else is still reported: `autocomplete: "shipping postal-code"` and the like, a valid
 * HTML autofill token that keeps two address blocks apart. It is silenced only when the
 * field name after the section token is itself an allowed value, so a typo still reports.
 *
 * `aiHint` needs no entry: it is a registered property (`src/schemas/custom-properties.ts`),
 * so a hint where the extractor never reads it, on a page or a panel, is reported.
 */
export function templateSuppressions(json: unknown): ISuppression[] {
  const allowed = new Set<unknown>(
    Serializer.findProperty("text", "autocomplete")?.choices ?? [],
  );
  const found: ISuppression[] = [];
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      const childPath = path ? `${path}.${key}` : key;
      if (key === "autocomplete" && typeof value === "string") {
        const field = AUTOFILL_SECTION.exec(value)?.[1];
        if (field && allowed.has(field)) {
          found.push({ ruleId: "property/invalid-value", path: childPath });
        }
      }
      walk(value, childPath);
    }
  };
  walk(json, "");
  return found;
}

/**
 * Lint a survey definition and give a verdict.
 *
 * `survey-core/linter` is headless (no DOM, no renderer), so this runs unchanged in a
 * route handler, a script or a test. It is the one entry point both front ends use: the
 * editor's status bar calls it while somebody types, and `/api/lint` calls it on what
 * arrives. Nothing here may import React, Monaco or Next.js, or the editor and the
 * server could start to disagree.
 */
export function lintSurveyJson(
  json: Record<string, unknown>,
  options: ISurveyLintOptions = {},
): SurveyLintVerdict {
  const result = lintSurvey(json, {
    ...options,
    suppress: [...templateSuppressions(json), ...(options.suppress ?? [])],
  });
  return {
    ok: result.findings.length === 0,
    findings: result.findings,
    ruleIds: getRules().map((rule) => rule.id),
    suppressedCount: result.suppressedCount,
  };
}
