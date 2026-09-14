"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SurveyData, SurveyJSON } from "@/schemas";
import { loadSurveyJson } from "@/storage/survey-json";
import { configureHref } from "@/lib/routes";
import { stableJson } from "@/lib/utils";
import { features } from "@/features";
import { DEFAULT_BRAND_ID, applyBrand, getBrand, type DemoSurvey } from "./demo-controls";
import { accountName, type DemoRosterEntry, type DemoUser } from "./demo-accounts";

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
 *     the definition reads it as `{user.something}`.
 *
 * Prefill and Reset are there so the pair can be demonstrated on a full form
 * without typing twelve answers first. The outline around the survey is not a
 * control at all — it is always on, because the first thing anyone asks about an
 * embedded demo is which part of the page is actually the form.
 */
export interface Demo {
  readonly survey: DemoSurvey;
  /** The definition to render: the shipped one, or this browser's saved one. */
  readonly json: SurveyJSON;
  /** Answers to load. `undefined` means start empty. */
  readonly seed: SurveyData | undefined;
  /**
   * What the host app knows about the visitor, ready for `setVariable`.
   *
   * One variable, `user`, holding the whole account — so the definition reads
   * `{user.firstName}` and can never collide with a question of the same name
   * (the clinic form has questions called `firstName` and `email`).
   */
  readonly variables: Record<string, unknown>;
  /** The same object, for the host page's own header and copy. */
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
    /** The dashboard for this form's responses, in editions that ship one. */
    analyticsHref?: string;
    /** The users the admin keeps for this demo, by display name. */
    users: readonly { id: string; name: string }[];
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
    account: Record<string, unknown>;
    edited: boolean;
    onRevert: () => void;
    configureHref: string;
  };
}

const DEBOUNCE_MS = 400;

export function useDemo({
  survey,
  user,
  /** Element the form lives in, so the demo can scroll back to it. */
  anchorId,
  brandId = DEFAULT_BRAND_ID,
  roster,
}: {
  survey: DemoSurvey;
  /** The visitor, plus the survey used to edit them. */
  user: DemoUser;
  anchorId: string;
  /** Palette the demo runs in, so no two host sites look alike. */
  brandId?: string;
  /**
   * The people this demo ships with, when it ships with more than one — the
   * clinic has a roster of patients, and the toolbar lets a reviewer sign in as
   * any of them.
   */
  roster?: readonly DemoRosterEntry[];
}): Demo {
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

  // One attribute on <html> for as long as a demo is on screen; the outline
  // itself is in `globals.css`, keyed off the `data-survey-root` marker that
  // `SurveyCard` carries.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-demo-highlight", "");
    return () => root.removeAttribute("data-demo-highlight");
  }, []);

  /* ── the definition, as the admin left it ────────────────────────────────── */

  const [json, setJson] = useState<SurveyJSON>(survey.json);

  /* ── the user the definition is rendered for ─────────────────────────────── */

  // The preset users this demo ships with, and what this window has since done
  // to them: the popup edits a copy, so Revert has something to go back to.
  const defaults = useMemo<readonly DemoRosterEntry[]>(
    () => roster ?? [{ id: "default", data: user.defaults }],
    [roster, user.defaults],
  );
  const [users, setUsers] = useState(defaults);
  const [activeUserId, setActiveUserId] = useState(defaults[0].id);

  // The answers the popup's editor opens on, and a counter that remounts it.
  // Kept apart from `users` because survey-core rebuilds its model whenever
  // `data` changes identity — feeding the live record back would restart the
  // editor on every letter typed into it.
  const editorSeed = useRef<SurveyData>(defaults[0].data);
  const [editorRun, setEditorRun] = useState(0);

  // The server always renders the definition that ships with the template — the
  // prerendered HTML, the one crawlers get, stays canonical — and a visitor who
  // edited this form on `/configure` gets their own version a tick later.
  useEffect(() => {
    let active = true;
    void loadSurveyJson(survey.id).then((stored) => {
      if (!active || !stored) return;
      setJson(stored);
      // A different definition is a different form, so the model is rebuilt
      // rather than re-fed.
      setRunCount((count) => count + 1);
    });
    return () => {
      active = false;
    };
  }, [survey.id]);

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

  const account = useMemo(() => user.toAccount(appliedForm), [user, appliedForm]);
  const variables = useMemo(() => ({ user: account }), [account]);

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
        name: accountName(user.toAccount(record.data)) || "Unnamed user",
      })),
    [users, user],
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
      json: user.json,
      defaults: editorSeed.current,
      formKey: `user-${activeRecord.id}-${editorRun}`,
      onDataChange: changeUserData,
      account,
      edited: accountEdited,
      onRevert: revertAccount,
      configureHref: href,
    },
  };
}
