"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  RotateCcwIcon,
  SquareArrowOutUpRightIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { EmbeddedSurvey, SurveyCard } from "@/components/embedded/shared/EmbeddedSurvey";
import { StaticAnalysisBar, type LintMarker } from "@/components/lint/StaticAnalysisBar";
import type { JsonEditorApi } from "@/components/JsonEditor";
import { accountName, usedVariableKeys } from "@/components/embedded/shared/demo-accounts";
import { loadSurveyJson, resetSurveyJson, saveSurveyJson } from "@/storage/survey-json";
import type { SurveyJSON } from "@/schemas";
import { FORMS, type FormEntry, getFormEntry } from "./forms";

const JsonEditor = dynamic(() => import("@/components/JsonEditor"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
      Loading editor…
    </div>
  ),
});

const PREVIEW_DEBOUNCE_MS = 400;

/**
 * The one variable the personalized forms are rendered for.
 *
 * The linter reads the JSON and nothing else, so `{user.firstName}` looks like a
 * reference to a question that does not exist — dozens of findings on a form that
 * works exactly as designed. Naming it here is the same declaration the demo
 * makes at runtime with `setVariable("user", account)`.
 */
const RUNTIME_VARIABLES = ["user"] as const;

function parse(source: string): { json?: SurveyJSON; error?: string } {
  try {
    const parsed = JSON.parse(source);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { error: "The form definition must be a JSON object." };
    }
    return { json: parsed as SurveyJSON };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Form JSON: the editor every form in the template opens in.
 *
 * The claim it exists to make is the plainest one the library has — **the form
 * is a JSON document.** The definition is on the left, with survey-core's own
 * linter under it; what a person will fill in is on the right, following it as
 * you type; and the primary button takes that definition back to where the form
 * actually lives, which for the embedded demos is somebody else's website.
 *
 * It carries no chrome of its own on purpose: `?form=` says which form is being
 * edited, and there is nothing else on the page — no sidebar, no list of the
 * others. A reviewer arrives here from a form and leaves back to it.
 *
 * Edits are kept per browser (localStorage — see `survey-json.ts`), so the URL
 * is safe to hand around: what a visitor breaks is theirs alone, and the server
 * keeps serving the definition that ships with the template.
 *
 * The users a personalized form is rendered for are not edited here. They belong
 * to the demo — its toolbar signs in as any of the preset ones and opens the
 * account in a popup — and this page only borrows the first of them, because a
 * form that reads `{user.firstName}` has to be rendered for somebody.
 */
export function JsonWorkbench({
  inShell = false,
}: {
  /**
   * Rendered inside the admin shell, on `/definition`: the workbench fills the
   * main area rather than the viewport, the shell's top bar supplies the theme
   * switch and the way out, and a picker opens any form in the template.
   * `/configure` leaves it off and stays the chromeless editor every form's
   * editor button opens.
   */
  inShell?: boolean;
}) {
  const params = useSearchParams();
  const form = getFormEntry(params.get("form"));

  // Keyed, so arriving at a different form starts from clean state.
  return <FormWorkbench key={form.id} form={form} inShell={inShell} />;
}

/**
 * Unsaved work, per form, for as long as the tab lives.
 *
 * Storage is written by the primary button alone, so without this a reviewer who
 * wandered off to the form and came back would find their edit gone.
 */
const drafts = new Map<string, string>();

function FormWorkbench({ form, inShell }: { form: FormEntry; inShell: boolean }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  // Read once: after this the draft is written, not read, so a later save or
  // reset cannot fight the state it seeded.
  const [draft] = useState(() => drafts.get(form.id));

  const defaultSource = useMemo(() => JSON.stringify(form.json, null, 2), [form.json]);
  const [source, setSource] = useState(draft ?? defaultSource);
  const [preview, setPreview] = useState(draft ?? defaultSource);
  const [customized, setCustomized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // The survey renders on the client only. It is an editor preview, so nothing
  // needs it in the server's HTML — and survey-core's action ids are numbered per
  // render, which a hydrating browser and a long-lived server disagree about.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // This browser's saved definition, if it has one, so the editor never sits on
  // the canonical JSON for somebody who has their own.
  useEffect(() => {
    if (draft) return;
    let active = true;
    void loadSurveyJson(form.id).then((saved) => {
      if (!active || !saved) return;
      const loaded = JSON.stringify(saved, null, 2);
      setSource(loaded);
      setPreview(loaded);
      setCustomized(true);
    });
    return () => {
      active = false;
    };
  }, [draft, form.id]);

  useEffect(() => {
    const timer = setTimeout(() => setPreview(source), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [source]);

  useEffect(() => {
    drafts.set(form.id, source);
  }, [form.id, source]);

  // Parsed once and shared: the banner, Format and the linter all read this, so
  // one keystroke never parses the document twice.
  const parsedSource = useMemo(() => parse(source), [source]);
  const parsedPreview = useMemo(() => parse(preview), [preview]);
  const syntaxError = parsedSource.error;

  const [markers, setMarkers] = useState<readonly LintMarker[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const editorApi = useRef<JsonEditorApi | null>(null);

  const selectedLine = useMemo(
    () => markers.find((marker) => marker.path === selectedPath)?.line ?? null,
    [markers, selectedPath],
  );

  // The demo's first preset user. A personalized definition has to be rendered
  // for somebody; switching between them belongs in the demo, not here.
  const account = useMemo(
    () => (form.user ? form.user.toAccount(form.user.defaults) : null),
    [form.user],
  );
  const variables = useMemo(() => (account ? { user: account } : undefined), [account]);

  const wiredKeys = useMemo(
    () =>
      account && parsedPreview.json ? usedVariableKeys(parsedPreview.json, account) : [],
    [account, parsedPreview.json],
  );

  const applyJson = useCallback((json: Record<string, unknown>) => {
    setSource(JSON.stringify(json, null, 2));
    setSelectedPath(null);
  }, []);

  const revealLine = useCallback((line: number) => {
    editorApi.current?.revealLine(line);
  }, []);

  const format = useCallback(() => {
    const { json } = parsedSource;
    if (json) setSource(JSON.stringify(json, null, 2));
  }, [parsedSource]);

  const reset = useCallback(async () => {
    await resetSurveyJson(form.id);
    drafts.delete(form.id);
    setSource(defaultSource);
    setCustomized(false);
    setStorageError(null);
    // Also drops whatever a "Try breaking it" action injected: those only ever
    // write to `source`, which this restores.
    setSelectedPath(null);
  }, [defaultSource, form.id]);

  // Save, then go where the form actually lives. For the embedded demos that is
  // somebody else's website, which is the reason to press it.
  const saveAndOpen = useCallback(async () => {
    const { json, error } = parse(source);
    if (!json) {
      setStorageError(error ?? "Invalid JSON.");
      return;
    }
    try {
      await saveSurveyJson(form.id, json);
    } catch (failure) {
      setStorageError((failure as Error).message);
      return;
    }
    setStorageError(null);
    router.push(form.href);
  }, [form.href, form.id, router, source]);

  const shown = wiredKeys.slice(0, 8);
  const rest = wiredKeys.length - shown.length;
  // Inside the shell the page header holds the h1.
  const Title = inShell ? "h2" : "h1";

  return (
    <div
      className={
        inShell
          ? "bg-background text-foreground flex h-full min-h-[40rem] flex-col rounded-lg border"
          : "bg-background text-foreground flex h-svh min-h-svh flex-col"
      }
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2.5 sm:px-6">
        <div className="min-w-0">
          <Title className="truncate text-sm font-semibold tracking-tight">
            {form.label} — form JSON
          </Title>
          <p className="text-muted-foreground truncate text-xs">
            The whole form is this document. Edits are kept in this browser only.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {inShell ? (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Form</span>
              <select
                className="border-input bg-background focus-visible:ring-ring/50 h-8 rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]"
                value={form.id}
                onChange={(event) =>
                  router.replace(`/definition?form=${encodeURIComponent(event.target.value)}`)
                }
              >
                {FORMS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <a href={form.href}>
                  <ArrowLeftIcon />
                  <span className="hidden sm:inline">Back</span>
                </a>
              </Button>
              <ThemeSwitcher />
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={format}
            disabled={Boolean(syntaxError)}
          >
            <WandSparklesIcon />
            Format
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={reset}
            disabled={source === defaultSource && !customized}
          >
            <RotateCcwIcon />
            Reset
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={saveAndOpen}
            disabled={Boolean(syntaxError)}
          >
            {form.embedded ? <SquareArrowOutUpRightIcon /> : <CheckIcon />}
            {form.previewLabel}
          </Button>
        </div>
      </header>

      {(syntaxError || storageError) && (
        <p className="border-destructive/50 text-destructive shrink-0 border-b px-4 py-2 text-sm sm:px-6">
          {storageError ?? syntaxError}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2">
        <div className="flex min-h-[26rem] min-w-0 flex-col overflow-hidden rounded-lg border">
          <div className="min-h-0 flex-1">
            <JsonEditor
              value={source}
              onChange={setSource}
              dark={resolvedTheme === "dark"}
              markers={markers}
              highlightLine={selectedLine}
              onReady={(api) => {
                editorApi.current = api;
              }}
              onMarkerActivate={setSelectedPath}
            />
          </div>
          <StaticAnalysisBar
            text={source}
            json={parsedSource.json ?? null}
            onRevealLine={revealLine}
            onMarkersChange={setMarkers}
            onApplyJson={applyJson}
            selectedPath={selectedPath}
            onSelectPath={setSelectedPath}
            knownVariables={form.user ? RUNTIME_VARIABLES : undefined}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          {account && (
            <p className="text-muted-foreground rounded-lg border px-3 py-2 text-xs leading-relaxed">
              Rendered for{" "}
              <span className="text-foreground font-medium">{accountName(account)}</span>
              , the first of this demo&apos;s preset users
              {wiredKeys.length > 0 ? (
                <>
                  . The definition reads{" "}
                  <span className="text-foreground font-medium">{shown.join(", ")}</span>
                  {rest > 0 ? ` and ${rest} more` : ""} off them — as{" "}
                  <code className="text-[11px]">{"{user.name}"}</code> in titles, in{" "}
                  <code className="text-[11px]">visibleIf</code> and in{" "}
                  <code className="text-[11px]">defaultValueExpression</code>. Sign in as
                  somebody else in the demo itself.
                </>
              ) : (
                ". It does not read anything off them yet."
              )}
            </p>
          )}

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {mounted && parsedPreview.json ? (
              <SurveyCard>
                <EmbeddedSurvey
                  key={preview}
                  json={parsedPreview.json}
                  variables={variables}
                />
              </SurveyCard>
            ) : (
              <div className="text-muted-foreground rounded-lg border p-6 text-sm">
                {parsedPreview.error ?? "Loading the form…"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
