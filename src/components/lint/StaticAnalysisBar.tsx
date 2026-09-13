"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { getRules, lintSurvey } from "survey-core/linter";
import type { ILintFinding, ISurveyLintResult } from "survey-core/linter";
import { Button } from "@/components/ui/button";
import { buildPathIndex, locatePath } from "@/lib/lint/monaco-adapter";
import { lintMutations } from "@/lib/lint/try-breaking-it";
import { mergeTailwindClasses } from "@/lib/utils";

export interface LintMarker {
  readonly path: string;
  readonly line: number;
  readonly severity: ILintFinding["severity"];
  readonly message: string;
}

interface LocatedFinding {
  readonly finding: ILintFinding;
  readonly line: number | null;
}

type Analysis =
  | { readonly kind: "waiting" }
  | {
      readonly kind: "done";
      readonly result: ISurveyLintResult;
      readonly located: readonly LocatedFinding[];
      readonly elementCount: number;
      readonly durationMs: number;
    };

const DEBOUNCE_MS = 300;

const severityClass: Record<ILintFinding["severity"], string> = {
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-muted-foreground",
};

/** Questions, panels and pages — what "inspected" means for a reader. */
function countElements(json: unknown): number {
  let total = 0;
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record.name === "string") total++;
    Object.values(record).forEach(walk);
  };
  walk((json as Record<string, unknown>)?.pages ?? json);
  return total;
}

/**
 * The failing case in words. The linter ships reproduction steps for the rules that
 * can express one and structured facts for the rest, so this falls back through
 * whatever a given finding actually carries.
 */
function failureCase(finding: ILintFinding): string | null {
  const reproduction = finding.reproduction;
  if (reproduction) {
    const values = reproduction.steps.flatMap((step) =>
      "set" in step
        ? Object.entries(step.set).map(
            ([name, value]) => `${name} = ${JSON.stringify(value)}`,
          )
        : [],
    );
    const trigger = values.length ? `Answer ${values.join(", ")} — ` : "";
    return `${trigger}${reproduction.description ?? ""}`.trim();
  }
  if (finding.suggestion) {
    return `Nothing resolves this reference. Closest known name: "${finding.suggestion}".`;
  }
  if (finding.related?.length) {
    const names = finding.related
      .map((item) => item.elementName ?? item.path)
      .join(", ");
    return `Also involves ${names}.`;
  }
  return null;
}

export function StaticAnalysisBar({
  text,
  json,
  onRevealLine,
  onMarkersChange,
  onApplyJson,
  selectedPath,
  onSelectPath,
  knownVariables,
}: {
  /** The JSON source as typed, used to turn a finding's path into a line number. */
  text: string;
  /** The same source already parsed, or null while it does not parse. */
  json: Record<string, unknown> | null;
  onRevealLine: (line: number) => void;
  onMarkersChange: (markers: readonly LintMarker[]) => void;
  onApplyJson: (json: Record<string, unknown>) => void;
  selectedPath: string | null;
  onSelectPath: (path: string | null) => void;
  /**
   * Variables the host sets at runtime with `setVariable`, so the linter does not
   * report them as unknown references. The personalized forms are rendered for
   * one variable, `user`, which no amount of reading the JSON could reveal.
   */
  knownVariables?: readonly string[];
}) {
  const [analysis, setAnalysis] = useState<Analysis>({ kind: "waiting" });
  const [expanded, setExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const autoExpandedRef = useRef(false);
  const lastAnnouncedRef = useRef("");

  useEffect(() => {
    if (!json) {
      setAnalysis({ kind: "waiting" });
      return;
    }
    const timer = setTimeout(() => {
      const startedAt = performance.now();
      const result = lintSurvey(
        json,
        knownVariables ? { knownVariables: [...knownVariables] } : undefined,
      );
      const durationMs = performance.now() - startedAt;
      const index = buildPathIndex(text);
      setAnalysis({
        kind: "done",
        result,
        located: result.findings.map((finding) => ({
          finding,
          line: locatePath(index, finding.path)?.line ?? null,
        })),
        elementCount: countElements(json),
        durationMs,
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [json, knownVariables, text]);

  const markers = useMemo<readonly LintMarker[]>(() => {
    if (analysis.kind !== "done") return [];
    return analysis.located
      .filter((item): item is LocatedFinding & { line: number } => item.line !== null)
      .map((item) => ({
        path: item.finding.path,
        line: item.line,
        severity: item.finding.severity,
        message: `${item.finding.ruleId}: ${item.finding.message}`,
      }));
  }, [analysis]);

  useEffect(() => {
    onMarkersChange(markers);
  }, [markers, onMarkersChange]);

  const issueCount = analysis.kind === "done" ? analysis.result.findings.length : 0;

  // Expand by default the first time a run reports something, and only that time.
  useEffect(() => {
    if (issueCount > 0 && !autoExpandedRef.current) {
      autoExpandedRef.current = true;
      setExpanded(true);
    }
  }, [issueCount]);

  // The live region announces a change of state, not every keystroke: while someone
  // types through an invalid document the message stays what it already was.
  useEffect(() => {
    const next =
      analysis.kind === "waiting"
        ? "Static analysis paused: waiting for valid JSON."
        : issueCount === 0
          ? "Static analysis: all checks passed."
          : `Static analysis: ${issueCount} ${issueCount === 1 ? "issue" : "issues"} found.`;
    if (next === lastAnnouncedRef.current) return;
    lastAnnouncedRef.current = next;
    setAnnouncement(next);
  }, [analysis.kind, issueCount]);

  const applyMutation = useCallback(
    (mutate: (input: Record<string, unknown>) => Record<string, unknown> | null) => {
      if (!json) return;
      const mutated = mutate(json);
      if (mutated) onApplyJson(mutated);
    },
    [json, onApplyJson],
  );

  const rules = useMemo(() => getRules(), []);
  const findingsByRule = useMemo(() => {
    const map = new Map<string, LocatedFinding[]>();
    if (analysis.kind !== "done") return map;
    for (const item of analysis.located) {
      const list = map.get(item.finding.ruleId);
      if (list) list.push(item);
      else map.set(item.finding.ruleId, [item]);
    }
    return map;
  }, [analysis]);

  const failing = rules.filter((rule) => findingsByRule.has(rule.id));
  const passing = rules.filter((rule) => !findingsByRule.has(rule.id));

  const waiting = analysis.kind === "waiting";
  const failed = !waiting && issueCount > 0;

  return (
    <div className="bg-background shrink-0 border-t text-sm">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex items-center gap-2 px-3 py-2">
        {waiting ? (
          <CircleDashedIcon className="text-muted-foreground size-4 shrink-0" />
        ) : failed ? (
          <TriangleAlertIcon
            className={mergeTailwindClasses("size-4 shrink-0", severityClass.warning)}
          />
        ) : (
          <CheckIcon className="size-4 shrink-0" />
        )}

        <span className="min-w-0 truncate">
          {waiting
            ? "Static analysis: waiting for valid JSON"
            : failed
              ? `Static analysis: ${issueCount} ${issueCount === 1 ? "issue" : "issues"}`
              : "Static analysis: all checks passed"}
        </span>

        {analysis.kind === "done" && (
          <span className="text-muted-foreground shrink-0 text-xs">
            {rules.length} checks · {Math.round(analysis.durationMs)}ms
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0 gap-1"
          aria-expanded={expanded}
          aria-controls="static-analysis-details"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
          {failed ? "View issues" : "View checks"}
        </Button>
      </div>

      {expanded && (
        <div
          id="static-analysis-details"
          className="max-h-72 overflow-y-auto border-t px-3 py-3"
        >
          <section>
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Checks performed
            </h3>
            {analysis.kind === "done" ? (
              <p className="text-muted-foreground mt-1 text-xs">
                {rules.length} checks over {analysis.elementCount} named elements.
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-xs">
                The document does not parse yet, so no check has run.
              </p>
            )}

            {failing.map((rule) => {
              const items = findingsByRule.get(rule.id) ?? [];
              return (
                <div key={rule.id} className="mt-3">
                  <p className="flex items-center gap-2 font-medium">
                    <TriangleAlertIcon
                      className={mergeTailwindClasses(
                        "size-3.5 shrink-0",
                        severityClass[items[0].finding.severity],
                      )}
                    />
                    <code className="text-xs">{rule.id}</code>
                    <span className="text-muted-foreground text-xs">
                      {items.length} {items.length === 1 ? "finding" : "findings"}
                    </span>
                  </p>
                  <ul className="mt-1 space-y-2">
                    {items.map((item) => {
                      const failure = failureCase(item.finding);
                      const active = selectedPath === item.finding.path;
                      return (
                        <li key={`${item.finding.ruleId}:${item.finding.path}`}>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectPath(item.finding.path);
                              if (item.line !== null) onRevealLine(item.line);
                            }}
                            className={mergeTailwindClasses(
                              "hover:bg-accent/60 w-full rounded-md border px-2 py-1.5 text-left",
                              active && "bg-accent/60 border-foreground/30",
                            )}
                          >
                            <span className="block">{item.finding.message}</span>
                            {failure && (
                              <span className="text-muted-foreground mt-1 block text-xs">
                                {failure}
                              </span>
                            )}
                            <span className="text-muted-foreground mt-1 block font-mono text-xs">
                              {item.finding.path}
                              {item.line !== null && ` · line ${item.line}`}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {analysis.kind === "done" && passing.length > 0 && (
              <ul className="text-muted-foreground mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {passing.map((rule) => (
                  <li key={rule.id} className="flex items-center gap-1.5">
                    <CheckIcon className="size-3 shrink-0" />
                    <code>{rule.id}</code>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-4 border-t pt-3">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Try breaking it
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Demo actions. Each one edits the JSON in the editor to introduce a
              single fault; Reset restores the original definition.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lintMutations.map((mutation) => (
                <Button
                  key={mutation.id}
                  variant="outline"
                  size="sm"
                  disabled={!json}
                  title={mutation.effect}
                  onClick={() => applyMutation(mutation.apply)}
                >
                  {mutation.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
