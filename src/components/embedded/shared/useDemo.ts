"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fromVariables,
  getVariablePresets,
  navPages,
  type SurveyData,
  type SurveyJSON,
} from "@/schemas";
import { configureHref, howHref } from "@/lib/routes";
import { stableJson } from "@/lib/utils";
import { features } from "@/features";
import { useSurveyOutline } from "@/components/survey-outline/SurveyOutline";
import { DEFAULT_BRAND_ID, applyBrand, getBrand, type DemoSurvey } from "./demo-controls";
import { accountName } from "./demo-accounts";

/**
 * Everything the embedded demos have in common, minus the page itself.
 *
 * Each demo is one host site with one form sitting inline in it, in its own brand
 * colour. Two things about that form are worth proving, and neither of them is
 * done here any more:
 *
 *  1. **it is a JSON document** — edited in the admin (`/admin`), which the
 *     toolbar links to. The definition saved there is what these pages render,
 *     so a reviewer sees the round trip rather than a second editor;
 *  2. **it is rendered for a person** — the toolbar's user popup, whose editor is
 *     itself a SurveyJS form, and the dropdown next to it when the admin holds
 *     more than one user. Changing the user moves values *and* structure, because
 *     the definition reads it as `{user_something}`.
 *
 * Prefill and Reset are there so the pair can be demonstrated on a full form
 * without typing twelve answers first. The outline around the survey is not a
 * control at all — it is always on, because the first thing anyone asks about an
 * embedded demo is which part of the page is actually the form.
 */
export interface Demo {
  readonly survey: DemoSurvey;
  /** The definition to render: the one this visitor stored, or the one that ships. */
  readonly json: SurveyJSON;
  /** Answers to load. `undefined` means start empty. */
  readonly seed: SurveyData | undefined;
  /**
   * What the host app knows about the visitor, ready for `setVariable`.
   *
   * One variable per field, prefixed `user_` — so the definition reads
   * `{user_firstName}` and can never collide with a question of the same name
   * (the clinic form has questions called `firstName` and `email`). These are
   * the active preset's `variables`, published as they are.
   */
  readonly variables: Record<string, unknown>;
  /** The same values as a plain account, for the host page's own header and copy. */
  readonly account: Record<string, unknown>;
  /** Changes whenever the survey has to be rebuilt from scratch. */
  readonly runKey: string;
  /** Scrolls the page to the form. */
  readonly requestSurvey: () => void;
  /** Rebuild the survey carrying these answers over — "change my answers". */
  readonly resumeWith: (data: SurveyData) => void;
  /**
   * Feed the survey's answers back, for the toolbar's PDF button.
   *
   * Every demo passes this to `EmbeddedSurvey`'s `onDataChange`. It is a ref
   * rather than state on purpose: a PDF needs the latest answers, and nothing on
   * the page needs to re-render because somebody typed. In an edition without a
   * PDF export nothing reads it, and it costs one assignment per change.
   */
  readonly trackAnswers: (data: SurveyData) => void;
  readonly dockProps: {
    onPrefill: () => void;
    onReset: () => void;
    onEditUser: () => void;
    /**
     * Downloads the form, with whatever has been answered, as a PDF. Undefined
     * when the edition provides no PDF export.
     */
    onExportPdf?: () => void;
    /** The one page this form's JSON is edited on. */
    configureHref: string;
    /** This demo's "How this page is built" explainer, inside the admin shell. */
    howHref?: string;
    /** The dashboard for this form's responses, in editions that ship one. */
    analyticsHref?: string;
    /** The users the admin keeps for this demo, by display name. */
    users: readonly { id: string; name: string; description?: string }[];
    activeUserId: string;
    onSelectUser: (id: string) => void;
    /** The account has been changed in this window — worth a dot. */
    edited: boolean;
    userOpen: boolean;
  };
  readonly userDialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    json: SurveyJSON;
    defaults: SurveyData;
    formKey: string;
    onDataChange: (data: SurveyData) => void;
    variables: Record<string, unknown>;
    edited: boolean;
    onRevert: () => void;
    configureHref: string;
  };
}

/** One preset, as the toolbar's picker lists it and the popup edits it. */
interface RosterEntry {
  readonly id: string;
  readonly description?: string;
  readonly data: SurveyData;
}

const DEBOUNCE_MS = 400;

export function useDemo({
  survey,
  /** Element the form lives in, so the demo can scroll back to it. */
  anchorId,
  brandId = DEFAULT_BRAND_ID,
}: {
  survey: DemoSurvey;
  anchorId: string;
  /** Palette the demo runs in, so no two host sites look alike. */
  brandId?: string;
}): Demo {
  // The form's variable presets, found by its id like its definition. The
  // presets are the people the toolbar lets a reviewer sign in as, and the
  // definition is the survey the "Edit the user" popup renders.
  const presets = useMemo(() => {
    const found = getVariablePresets(survey.id);
    if (!found?.presets?.length) throw new Error(`No variable presets for ${survey.id}`);
    return found;
  }, [survey.id]);

  // A fresh seed object remounts the survey model, which is what Prefill and
  // Reset want; `runCount` covers resetting when there was nothing to clear.
  const [seed, setSeed] = useState<SurveyData | undefined>(undefined);
  const [runCount, setRunCount] = useState(0);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    applyBrand(getBrand(brandId));
  }, [brandId]);

  // The demo owns the palette only while it is on screen.
  useEffect(() => () => applyBrand(getBrand("neutral")), []);

  // The "SurveyJS renders this" outline, for as long as a demo is on screen.
  useSurveyOutline();

  /* ── the definition, as the admin left it ────────────────────────────────── */

  // The page read the visitor's definition on the server and passed it in
  // `survey.json`, so the first render is already the form they stored.
  const [json] = useState<SurveyJSON>(survey.json);

  /* ── the user the definition is rendered for ─────────────────────────────── */

  // The preset users this demo ships with, and what this window has since done
  // to them: the popup edits a copy, so Revert has something to go back to.
  // Keyed by preset name; `data` is the preset's variables, prefixed already.
  const defaults = useMemo<readonly RosterEntry[]>(
    () =>
      (presets.presets ?? []).map((preset) => ({
        id: preset.name,
        description: preset.description,
        data: preset.variables,
      })),
    [presets],
  );
  const [users, setUsers] = useState(defaults);
  const [activeUserId, setActiveUserId] = useState(defaults[0].id);

  // The answers the popup's editor opens on, and a counter that remounts it.
  // Kept apart from `users` because survey-core rebuilds its model whenever
  // `data` changes identity — feeding the live record back would restart the
  // editor on every letter typed into it.
  const editorSeed = useRef<SurveyData>(defaults[0].data);
  const [editorRun, setEditorRun] = useState(0);

  const activeRecord = users.find((record) => record.id === activeUserId) ?? users[0];
  const savedRecord = defaults.find((record) => record.id === activeUserId);

  // The answers the page is currently rendered from. Debounced away from the
  // editor's own state for the same reason the JSON editor was: typing a name
  // should not rebuild the survey model on every keystroke.
  const [appliedForm, setAppliedForm] = useState<SurveyData>(activeRecord.data);

  useEffect(() => {
    if (activeRecord.data === appliedForm) return;
    const timer = setTimeout(() => {
      setAppliedForm(activeRecord.data);
      // A different user is a different form, so the model is rebuilt rather
      // than re-fed — `runKey` remounts it.
      setRunCount((count) => count + 1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [activeRecord.data, appliedForm]);

  const variables = appliedForm;
  const account = useMemo(() => fromVariables(appliedForm), [appliedForm]);

  const accountEdited = useMemo(
    () =>
      stableJson(activeRecord.data) !==
      stableJson(savedRecord?.data ?? defaults[0].data),
    [activeRecord.data, savedRecord, defaults],
  );

  const userOptions = useMemo(
    () =>
      users.map((record) => ({
        id: record.id,
        name: accountName(fromVariables(record.data)) || "Unnamed user",
        description: record.description,
      })),
    [users],
  );

  /* ── actions ─────────────────────────────────────────────────────────────── */

  const revealAnchor = useCallback(() => {
    requestAnimationFrame(() =>
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth" }),
    );
  }, [anchorId]);

  // The answers as they stand, for the PDF button. Deliberately not state.
  const answers = useRef<SurveyData>({});
  const trackAnswers = useCallback((data: SurveyData) => {
    answers.current = data;
  }, []);

  const exportPdf = useMemo(() => {
    const exportSurvey = features.exportPdf;
    if (!exportSurvey) return undefined;
    return () => {
      void exportSurvey(json, { label: survey.label, data: answers.current });
    };
  }, [json, survey.label]);

  const restart = useCallback(() => {
    setSeed(undefined);
    setRunCount((count) => count + 1);
  }, []);

  const prefill = useCallback(() => {
    setSeed({ ...survey.prefill });
    setRunCount((count) => count + 1);
  }, [survey.prefill]);

  const resumeWith = useCallback(
    (data: SurveyData) => {
      setSeed({ ...data });
      setRunCount((count) => count + 1);
      revealAnchor();
    },
    [revealAnchor],
  );

  const selectUser = useCallback(
    (id: string) => {
      const record = users.find((item) => item.id === id);
      if (!record) return;
      setActiveUserId(id);
      editorSeed.current = record.data;
      setEditorRun((run) => run + 1);
      setAppliedForm(record.data);
      setRunCount((count) => count + 1);
    },
    [users],
  );

  const changeUserData = useCallback(
    (data: SurveyData) => {
      setUsers((current) =>
        current.map((record) =>
          record.id === activeUserId ? { ...record, data } : record,
        ),
      );
    },
    [activeUserId],
  );

  const revertAccount = useCallback(() => {
    const original = savedRecord?.data ?? defaults[0].data;
    setUsers((current) =>
      current.map((record) =>
        record.id === activeUserId ? { ...record, data: original } : record,
      ),
    );
    editorSeed.current = original;
    setEditorRun((run) => run + 1);
    setAppliedForm(original);
    setRunCount((count) => count + 1);
  }, [activeUserId, defaults, savedRecord]);

  const href = configureHref(survey.id);
  // The explainer for this demo. These pages wear no admin chrome, so there is
  // no top bar to toggle a drawer from and no drawer over somebody else's
  // website: the dock links the `/how` page instead, in a new tab like its
  // other links. Found by the form it renders, which is what a demo knows.
  const explainerHref = useMemo(() => {
    const nav = navPages.find(
      (item) => item.layout === "embedded" && item.schemaId === survey.id,
    );
    return nav ? howHref(nav.path) : undefined;
  }, [survey.id]);

  return {
    survey,
    json,
    seed,
    variables,
    account,
    runKey: `${survey.id}-${runCount}`,
    requestSurvey: revealAnchor,
    resumeWith,
    trackAnswers,
    dockProps: {
      onPrefill: prefill,
      onReset: restart,
      onEditUser: () => setUserOpen((open) => !open),
      onExportPdf: exportPdf,
      configureHref: href,
      howHref: explainerHref,
      analyticsHref: features.analyticsHref?.(survey.id),
      users: userOptions,
      activeUserId: activeRecord.id,
      onSelectUser: selectUser,
      edited: accountEdited,
      userOpen,
    },
    userDialogProps: {
      open: userOpen,
      onOpenChange: setUserOpen,
      json: presets.definition as SurveyJSON,
      defaults: editorSeed.current,
      formKey: `user-${activeRecord.id}-${editorRun}`,
      onDataChange: changeUserData,
      variables,
      edited: accountEdited,
      onRevert: revertAccount,
      configureHref: href,
    },
  };
}
