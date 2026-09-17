"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FileDownIcon, PlusIcon, RotateCcwIcon, ScanTextIcon } from "lucide-react";
import type { Model } from "survey-core";
import {
  getRecordCollection,
  isActiveRoute,
  recordTitle,
  sortRows,
  toVariables,
  type RecordRow,
  type SessionUser,
  type SourceDocument,
  type StoredRecord,
  type SurveyData,
  type SurveyJSON,
} from "@/schemas";
import { deleteResult, getResult, resetDemoData, saveResult } from "@/storage/survey-results";
import { features } from "@/features";
import { configureHref, recordHref } from "@/lib/routes";
import { stableJson } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { useStorageAccess } from "@/components/StorageAccess";
import { SurveyForm } from "@/components/SurveyForm";
import { SurveyOutline, useSurveyOutline } from "@/components/survey-outline/SurveyOutline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isEmpty } from "./ColumnValue";
import { RecordPicker } from "./RecordPicker";
import { RecordRail } from "./RecordRail";
import { UserSwitcher } from "./UserSwitcher";

type Mode = "view" | "edit" | "new";

interface OpenRecord {
  readonly mode: Mode;
  /** The last stored version. For a new record, the document it starts from. */
  readonly record: StoredRecord;
  /** What the form loads: `record.data`, or the answers carried over a user switch. */
  readonly data: SurveyData;
  /** Remounts the form. */
  readonly key: number;
  /** For a new record: what Cancel goes back to. */
  readonly previous?: StoredRecord;
}

interface DiscardRequest {
  readonly title: string;
  /** What Discard does. */
  readonly run: () => void;
  /** What dismissing the dialog undoes, when the URL started the transition: the URL. */
  readonly cancel?: () => void;
}

type CreateFrom = (data: SurveyData, source?: SourceDocument) => Promise<void>;

/** A way to add a record from a document, in a panel that takes the form column's place. */
export interface DocumentImport {
  /** The header button: "Add from document". */
  readonly label: string;
  /** The panel's URL, under the page: "from-document" is `/work-orders/from-document`. */
  readonly segment: string;
  /**
   * The panel. `createFrom` stores a new record made from answers read off
   * `source`, and opens it. `onBusyChange` reports a reading in flight, during
   * which nothing on the page leaves the panel.
   */
  readonly render: (api: {
    createFrom: CreateFrom;
    onBusyChange: (busy: boolean) => void;
  }) => ReactNode;
}

/** A storage failure, as the message shown under the form's heading. */
function messageOf(failure: unknown): string {
  return failure instanceof Error && failure.message ? failure.message : "Storage did not answer.";
}

/** What Cancel, Close and a deleted Back target return to. */
function returnRecord(open: OpenRecord | null): StoredRecord | undefined {
  return open?.mode === "new" ? open.previous : open?.record;
}

/**
 * The canonical URL a pathname under the page names: the page itself (which
 * shows the first record), the import panel, or one record. `undefined` for a
 * pathname outside the page.
 */
function routeOf(pathname: string, basePath: string, segment: string | undefined): string | undefined {
  if (!isActiveRoute(pathname, basePath)) return undefined;
  const rest = pathname.slice(basePath.length).replace(/^\/+|\/+$/g, "");
  if (!rest) return basePath;
  let id = rest;
  try {
    id = decodeURIComponent(rest);
  } catch {
    // A malformed escape is just an id nobody has.
  }
  return id === segment ? `${basePath}/${segment}` : recordHref(basePath, id);
}

/**
 * A records page: a rail of stored records, and one form that views, edits and
 * adds them.
 *
 * Everything page-specific is data in the collection (`src/schemas/records.ts`):
 * the columns, the two lines the rail shows, how they derive from a response,
 * the id and the defaults of a new record. The rail shows columns only; opening
 * a record fetches its document. Saving writes the document and puts back the
 * columns storage derived from it, never columns computed here.
 *
 * The URL is where the selection lives: `basePath` shows the first record, and
 * `basePath/<id>` one record. Moving between records writes the URL with
 * `window.history`, which Next.js syncs into `usePathname`, and never with
 * `next/link` or `router.push`: those re-render the server component for every
 * click, and the form, the rail and the unsaved-changes guard would all start
 * over. Opening a row fetches only its document. Back and Forward reach the
 * pathname effect below, and go through the same unsaved-changes guard as a click.
 *
 * Every write goes through the storage seam, and a refusal (the storage cap, a
 * network failure) is shown under the form's heading with the form left as it
 * was. In a browser that blocks the storage cookie every write control is
 * disabled, and the page is for browsing.
 *
 * It subscribes to no SurveyJS event. It reads `model.data`, calls
 * `model.toJSON()`, `model.validate()` and `model.completeLastPage()`, and gets
 * saves through `SurveyForm`'s `onComplete`.
 */
export function RecordsView({
  collectionId,
  title,
  description,
  basePath,
  schema,
  initialRows,
  initialRecord,
  initialImport = false,
  users = [],
  exportPdf,
  documentImport,
  formNote,
}: {
  collectionId: string;
  /** The nav label, for the page header and the rail's landmark. */
  title: string;
  description: string;
  /** The page's route, `nav.path`. Record URLs are built under it. */
  basePath: string;
  /** The collection's definition as this visitor stored it, read on the server by the page. */
  schema: SurveyJSON;
  initialRows: readonly RecordRow[];
  /**
   * The document read on the server: the URL's record, or the first row's when
   * the URL names none or one the server does not hold.
   */
  initialRecord: StoredRecord | undefined;
  /** The page was loaded at the import panel's URL. */
  initialImport?: boolean;
  /** From `listSessionUsers`. Fewer than two renders no switcher. */
  users?: readonly SessionUser[];
  /** Replaces the generic PDF export for this collection (Work orders: the job sheet). */
  exportPdf?: (data: SurveyData) => void | Promise<void>;
  /** Adding a record from a document (Work orders). Without it, no button and no panel. */
  documentImport?: DocumentImport;
  /** One or two sentences under the form column's heading. */
  formNote?: ReactNode;
}) {
  const collection = getRecordCollection(collectionId);
  const { schemaId, noun } = collection;
  const { readOnly } = useStorageAccess();
  const segment = documentImport?.segment;
  const importPath = segment === undefined ? undefined : `${basePath}/${segment}`;

  // The ring around the form: the records pages show which part SurveyJS draws,
  // as the embedded demos do.
  useSurveyOutline();

  const [rows, setRows] = useState<RecordRow[]>(() => [...initialRows]);
  const [open, setOpen] = useState<OpenRecord | null>(() =>
    initialRecord
      ? { mode: "view", record: initialRecord, data: initialRecord.data, key: 0 }
      : null,
  );
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecordRow | null>(null);
  const [discard, setDiscard] = useState<DiscardRequest | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  // The last write or read storage refused, until the next transition.
  const [storageError, setStorageError] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState(users[0]?.id);
  const formColumn = useRef<HTMLDivElement>(null);

  // The import panel. `open` stays the record the panel returns to.
  const [importing, setImporting] = useState(initialImport && importPath !== undefined);
  const [importBusy, setImportBusy] = useState(false);
  const [importReturnPath, setImportReturnPath] = useState(basePath);

  // Callbacks read the latest state through refs, so the ones handed to the
  // form keep their identity and never rebuild or re-snapshot it.
  const openRef = useRef(open);
  const rowsRef = useRef(rows);
  const modelRef = useRef(model);
  useEffect(() => {
    openRef.current = open;
    rowsRef.current = rows;
    modelRef.current = model;
  });
  // Written together with their state, because a transition reads them in the
  // same handler that changes them.
  const importingRef = useRef(importing);
  const importBusyRef = useRef(importBusy);
  const importReturnPathRef = useRef(importReturnPath);
  const setImportingNow = useCallback((value: boolean) => {
    importingRef.current = value;
    setImporting(value);
  }, []);
  const setImportBusyNow = useCallback((value: boolean) => {
    importBusyRef.current = value;
    setImportBusy(value);
  }, []);
  const setImportReturnPathNow = useCallback((value: string) => {
    importReturnPathRef.current = value;
    setImportReturnPath(value);
  }, []);

  const activeUser = users.find((user) => user.id === activeUserId) ?? users[0];
  // A session user is a plain account: it becomes `user_…` variables here, once.
  const variables = useMemo(() => (activeUser ? toVariables(activeUser) : undefined), [activeUser]);

  /* ── the URL ─────────────────────────────────────────────────────────────── */

  const pathname = usePathname();

  // What the URL the app last wrote names. Set before every push and replace,
  // so the pathname effect tells the app's own writes from Back and Forward.
  const loadedRoute = routeOf(pathname, basePath, segment) ?? basePath;
  const givenRoute = initialRecord ? recordHref(basePath, initialRecord.id) : basePath;
  const fallsBack = loadedRoute !== basePath && loadedRoute !== importPath && loadedRoute !== givenRoute;
  const routeTarget = useRef(fallsBack ? givenRoute : loadedRoute);
  // An id the page was not given a record for (unknown, deleted, or created in
  // another browser) opened the first record instead; its URL goes in the
  // address bar, with no notice. Until Next.js reports that URL, the old one is
  // expected, not a Back.
  const replacedRoute = useRef(fallsBack ? loadedRoute : null);

  const writeRoute = useCallback((href: string, how: "push" | "replace") => {
    routeTarget.current = href;
    if (window.location.pathname === href) return;
    if (how === "push") window.history.pushState(null, "", href);
    else window.history.replaceState(null, "", href);
  }, []);

  useEffect(() => {
    if (replacedRoute.current === null) return;
    const href = routeTarget.current;
    // A tick later: Next.js patches `history` in its router's own effect, which
    // runs after this one, and only a patched `replaceState` reaches `usePathname`.
    const timer = setTimeout(() => window.history.replaceState(null, "", href), 0);
    return () => clearTimeout(timer);
  }, []);

  /** The URL of what is on screen: the panel, or the open record (for a new one, the record before it). */
  const screenRoute = useCallback(() => {
    if (importingRef.current && importPath) return importPath;
    const shown = returnRecord(openRef.current);
    return shown ? recordHref(basePath, shown.id) : basePath;
  }, [basePath, importPath]);

  /* ── unsaved changes ─────────────────────────────────────────────────────── */

  // The answers as the form loaded them, computed values included.
  const snapshot = useRef<string | null>(null);
  // Set by a user switch: the page the viewer was on, for the rebuilt model,
  // which must not count as a fresh load either.
  const carriedPage = useRef<number | null>(null);

  const handleModelReady = useCallback((next: Model) => {
    setModel(next);
    if (carriedPage.current !== null) {
      next.currentPageNo = carriedPage.current;
      carriedPage.current = null;
      return;
    }
    snapshot.current = stableJson(next.data as SurveyData);
  }, []);

  // Bumped by every transition, so a record fetched for an older one is dropped.
  const request = useRef(0);

  const nextKey = (prev: OpenRecord | null) => (prev?.key ?? 0) + 1;

  const openTitle = (current: OpenRecord) =>
    current.mode === "new" ? `the new ${noun.one}` : recordTitle(collection, current.record);

  /**
   * Runs `action`, or first asks, when the open form has changes nobody saved.
   * `cancel` runs when the question is dismissed rather than answered.
   */
  const guard = useCallback(
    (action: () => void, cancel?: () => void) => {
      const current = openRef.current;
      const form = modelRef.current;
      const changed =
        current !== null &&
        current.mode !== "view" &&
        form !== null &&
        snapshot.current !== null &&
        stableJson(form.data as SurveyData) !== snapshot.current;
      if (changed) {
        setDiscard({ title: openTitle(current), run: action, cancel });
      } else {
        action();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionId],
  );

  /** Keep editing, the X, Escape, a click outside: undo what started the transition. */
  const dismissDiscard = () => {
    discard?.cancel?.();
    setDiscard(null);
  };

  /* ── the import panel ────────────────────────────────────────────────────── */

  /** The one way out of the panel; every transition that leaves it calls this first. */
  const leaveImport = useCallback(() => {
    setImportingNow(false);
    // A reading that finished unmounted the panel before it could report so.
    setImportBusyNow(false);
  }, [setImportingNow, setImportBusyNow]);

  const openImport = useCallback(
    (returnTo: string, cancel?: () => void) => {
      if (!importPath) return;
      guard(() => {
        request.current++;
        setLoading(false);
        setImportingNow(true);
        // No form while the panel is open: "Save as PDF" disables on `!model`,
        // and the guard has no stale form left to compare after a discard.
        setModel(null);
        snapshot.current = null;
        setImportReturnPathNow(returnTo === importPath ? basePath : returnTo);
        writeRoute(importPath, "push");
      }, cancel);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basePath, importPath, guard, writeRoute],
  );

  /* ── opening ─────────────────────────────────────────────────────────────── */

  const show = useCallback((mode: "view" | "edit", record: StoredRecord) => {
    setStorageError(null);
    setOpen((prev) => ({ mode, record, data: record.data, key: nextKey(prev) }));
  }, []);

  const openRow = useCallback(
    (id: string, mode: "view" | "edit", options: { push?: boolean; cancel?: () => void } = {}) =>
      guard(() => {
        // A rail click or Back and Forward leave the panel.
        const leftImport = importingRef.current;
        if (leftImport) leaveImport();
        if (options.push) writeRoute(recordHref(basePath, id), "push");
        const current = openRef.current;
        if (current && current.mode !== "new" && current.record.id === id) {
          request.current++;
          setLoading(false);
          show(mode, current.record);
          return;
        }
        const ticket = ++request.current;
        setLoading(true);
        // Stay on what is open, at its own URL.
        const stay = () => {
          const back = returnRecord(openRef.current);
          if (leftImport && back) show("view", back);
          writeRoute(screenRoute(), "replace");
        };
        getResult(collectionId, id).then(
          (record) => {
            if (ticket !== request.current) return;
            setLoading(false);
            if (record) {
              show(mode, record);
              return;
            }
            // A Back or Forward target that is gone, deleted in this tab.
            stay();
          },
          (failure: unknown) => {
            if (ticket !== request.current) return;
            setLoading(false);
            stay();
            setStorageError(messageOf(failure));
          },
        );
      }, options.cancel),
    [basePath, collectionId, guard, leaveImport, screenRoute, show, writeRoute],
  );

  const selectRow = useCallback(
    (id: string) => openRow(id, "view", { push: true }),
    [openRow],
  );

  const startNew = useCallback(
    () =>
      guard(() => {
        if (importingRef.current) {
          leaveImport();
          writeRoute(importReturnPathRef.current, "push");
        }
        request.current++;
        setLoading(false);
        setStorageError(null);
        const id = collection.newId(rowsRef.current.map((row) => row.id));
        const data = collection.newRecord(id, activeUser);
        setOpen((prev) => ({
          mode: "new",
          record: { id, columns: collection.toColumns(id, data), data },
          data,
          key: nextKey(prev),
          previous: returnRecord(prev),
        }));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionId, guard, leaveImport, writeRoute, activeUser],
  );

  const cancel = useCallback(
    () =>
      guard(() => {
        const back = returnRecord(openRef.current);
        if (back) show("view", back);
        else setOpen(null);
      }),
    [guard, show],
  );

  const closeImport = useCallback(() => {
    if (importBusyRef.current) return;
    leaveImport();
    const back = returnRecord(openRef.current);
    if (back) show("view", back);
    else setOpen(null);
    writeRoute(importReturnPathRef.current, "push");
  }, [leaveImport, show, writeRoute]);

  // Back and Forward. The app's own writes set `routeTarget` first and stop here.
  useEffect(() => {
    const route = routeOf(pathname, basePath, segment);
    if (route === undefined) return;
    if (route === routeTarget.current) {
      replacedRoute.current = null;
      return;
    }
    if (route === replacedRoute.current) return;

    if (importBusyRef.current && importPath) {
      // History cannot be blocked, so a reading in flight puts the panel's URL back.
      writeRoute(importPath, "push");
      return;
    }

    const onScreen = screenRoute();
    routeTarget.current = route;
    const restore = () => writeRoute(screenRoute(), "push");
    if (route === importPath) {
      openImport(onScreen, restore);
      return;
    }
    const id = route === basePath ? rowsRef.current[0]?.id : decodeURIComponent(route.slice(basePath.length + 1));
    if (id !== undefined) {
      openRow(id, "view", { cancel: restore });
      return;
    }
    guard(() => {
      if (importingRef.current) leaveImport();
      setOpen(null);
    }, restore);
  }, [pathname, basePath, segment, importPath, guard, leaveImport, openImport, openRow, screenRoute, writeRoute]);

  /* ── saving ──────────────────────────────────────────────────────────────── */

  const upsertRow = useCallback(
    (saved: StoredRecord) =>
      setRows((prev) => {
        const row = { id: saved.id, columns: saved.columns };
        const next = prev.some((item) => item.id === saved.id)
          ? prev.map((item) => (item.id === saved.id ? row : item))
          : [...prev, row];
        return sortRows(collection, next);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionId],
  );

  const handleComplete = useCallback(
    async (data: SurveyData) => {
      const current = openRef.current;
      if (!current) return;
      let saved: StoredRecord;
      try {
        saved = await saveResult(collectionId, current.record.id, data);
      } catch (failure) {
        // The form already completed, so it is rebuilt with the answers that were
        // not saved, on the page it was on, still unsaved as far as the guard is
        // concerned.
        const form = modelRef.current;
        if (form) carriedPage.current = form.currentPageNo;
        setOpen((prev) => prev && { ...prev, data, key: nextKey(prev) });
        setStorageError(messageOf(failure));
        return;
      }
      upsertRow(saved);
      if (current.mode === "new") writeRoute(recordHref(basePath, saved.id), "push");
      show("view", saved);
    },
    [basePath, collectionId, show, upsertRow, writeRoute],
  );

  // The header's Save checks every page, not only the one on screen:
  // `completeLastPage` alone validates the current page and would store a record
  // with errors on another. `validate` switches to the first page with one.
  const saveChanges = useCallback(() => {
    if (!model) return;
    if (model.validate(true, true, undefined, true)) model.completeLastPage();
  }, [model]);

  const createFrom = useCallback<CreateFrom>(
    async (extracted, source) => {
      // Values a source left blank come back empty, and are dropped rather than
      // written over the new record's own defaults.
      const answers = Object.fromEntries(
        Object.entries(extracted).filter(([, value]) => !isEmpty(value)),
      );
      const existing = rowsRef.current.map((row) => row.id);
      const { fromDocument } = collection;
      const id = fromDocument?.id?.(answers, existing) ?? collection.newId(existing);
      // Precedence, lowest first. With `fromDocument`: the new record's defaults
      // fill only what the document left blank, every answer read off it wins
      // over them, and `pinned` (the id, the draft status, where the record came
      // from) wins over both, so a document can neither complete a record nor
      // forge its own provenance. Without it: the defaults win over every answer.
      const document = fromDocument
        ? { ...collection.newRecord(id, activeUser), ...answers, ...fromDocument.pinned(id, source) }
        : { ...answers, ...collection.newRecord(id, activeUser) };
      let saved: StoredRecord;
      try {
        saved = await saveResult(collectionId, id, document);
      } catch (failure) {
        // The panel reports it, where the visitor is looking, and keeps the
        // reading unspent.
        throw new Error(messageOf(failure), { cause: failure });
      }
      upsertRow(saved);
      // The panel cleared the model, so this passes straight through.
      guard(() => {
        if (importingRef.current) leaveImport();
        writeRoute(recordHref(basePath, saved.id), "push");
        show("edit", saved);
        requestAnimationFrame(() =>
          formColumn.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basePath, collectionId, activeUser, guard, leaveImport, show, upsertRow, writeRoute],
  );

  const confirmDelete = useCallback(async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    try {
      await deleteResult(collectionId, target.id);
    } catch (failure) {
      setStorageError(messageOf(failure));
      return;
    }
    const remaining = rowsRef.current.filter((row) => row.id !== target.id);
    setRows(remaining);
    // The form is always open on some record, so deleting the open one falls
    // back to whatever is left.
    const current = openRef.current;
    if (current && current.mode !== "new" && current.record.id === target.id) {
      const next = remaining[0];
      if (!next) {
        writeRoute(basePath, "replace");
        setOpen(null);
        return;
      }
      // Until the next record arrives the deleted one is still on screen, so it
      // counts as loading: Edit and Delete are off, and a second Delete cannot
      // hit the same id. A row picked meanwhile wins.
      const ticket = ++request.current;
      setLoading(true);
      let record: StoredRecord | undefined;
      try {
        record = await getResult(collectionId, next.id);
      } catch (failure) {
        if (ticket !== request.current) return;
        setLoading(false);
        writeRoute(basePath, "replace");
        setOpen(null);
        setStorageError(messageOf(failure));
        return;
      }
      if (ticket !== request.current) return;
      setLoading(false);
      if (record) {
        writeRoute(recordHref(basePath, record.id), "replace");
        show("view", record);
      }
    }
  }, [basePath, collectionId, deleteTarget, show, writeRoute]);

  /**
   * "Reset demo data": this visitor's sandbox is deleted and the browser gets a
   * new id. A full load then shows the seed, which is the honest way to show a
   * fresh visitor: every piece of state on the page is theirs no longer.
   */
  const resetData = useCallback(async () => {
    setConfirmReset(false);
    try {
      await resetDemoData();
    } catch (failure) {
      setStorageError(messageOf(failure));
      return;
    }
    window.location.assign(basePath);
  }, [basePath]);

  /* ── the signed-in user ──────────────────────────────────────────────────── */

  const selectUser = useCallback(
    (id: string) => {
      if (id === activeUserId) return;
      // Switching user shows what the *same answers* look like to somebody
      // else, which is the claim a role-aware form makes. So the rebuilt model
      // carries the answers on screen, saved or not, and the page they were on;
      // the snapshot stays, because the switch alone is not a change.
      const form = modelRef.current;
      if (form && openRef.current) {
        carriedPage.current = form.currentPageNo;
        const data = form.data as SurveyData;
        setOpen((prev) => prev && { ...prev, data, key: nextKey(prev) });
      }
      setActiveUserId(id);
    },
    [activeUserId],
  );

  /* ── PDF ─────────────────────────────────────────────────────────────────── */

  // What is exported is the record, so the button sits with the record's
  // actions rather than in the survey's navigation.
  const canExportPdf = Boolean(exportPdf || features.exportPdf);
  const saveAsPdf = useCallback(() => {
    if (!model) return;
    const data = model.data as SurveyData;
    if (exportPdf) {
      void exportPdf(data);
    } else if (features.exportPdf) {
      void features.exportPdf(model.toJSON() as SurveyJSON, { label: title, data });
    }
  }, [exportPdf, model, title]);

  /* ── render ──────────────────────────────────────────────────────────────── */

  const heading = open
    ? open.mode === "new"
      ? `New ${noun.one}`
      : `${open.mode === "edit" ? "Edit" : "View"} ${recordTitle(collection, open.record)}`
    : "";

  // Nothing in the list is selected while a new record or the panel is open.
  const selectedId = !importing && open && open.mode !== "new" ? open.record.id : undefined;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        configureHref={configureHref(schemaId)}
        analyticsHref={features.analyticsHref?.(schemaId)}
        actions={
          <>
            {documentImport && (
              <Button
                size="sm"
                className="gap-2"
                disabled={importing || readOnly}
                onClick={() => openImport(window.location.pathname)}
              >
                <ScanTextIcon />
                {documentImport.label}
              </Button>
            )}
            {activeUser && (
              <UserSwitcher users={users} activeId={activeUser.id} onSelect={selectUser} />
            )}
            {canExportPdf && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!model || !open}
                onClick={saveAsPdf}
              >
                <FileDownIcon />
                Save as PDF
              </Button>
            )}
            {/* Enabled with no record open too: an emptied list is exactly when
                it is wanted. */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              disabled={readOnly || importBusy}
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcwIcon />
              Reset demo data
            </Button>
          </>
        }
      />

      {/* From `xl` the rail sits beside the form; below it, `RecordPicker` takes
          its place. At 1280px that leaves the form 676px, above the theme's
          640px `--sd-mobile-width`, so matrices keep their columns. */}
      <div className="grid items-start gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden min-w-0 overflow-x-hidden xl:sticky xl:top-0 xl:block xl:max-h-[calc(100svh-8rem)] xl:overflow-y-auto">
          <RecordRail
            collection={collection}
            title={title}
            rows={rows}
            selectedId={selectedId}
            basePath={basePath}
            onSelect={selectRow}
            onNew={startNew}
            noun={noun}
            disabled={importBusy}
            newDisabled={readOnly}
          />
        </div>

        <div ref={formColumn} className="min-w-0">
          <RecordPicker
            collection={collection}
            rows={rows}
            selectedId={selectedId}
            onSelect={selectRow}
            onNew={startNew}
            noun={noun}
            disabled={importBusy}
            newDisabled={readOnly}
          />

          {importing && documentImport ? (
            <>
              <div className="mb-3 flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" disabled={importBusy} onClick={closeImport}>
                  Close
                </Button>
              </div>
              {documentImport.render({ createFrom, onBusyChange: setImportBusyNow })}
            </>
          ) : open ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{heading}</h2>
                <div className="flex gap-2">
                  {open.mode === "view" ? (
                    <>
                      {/* Off while another row loads: the URL already names it,
                          and these would act on the record still on screen. */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={readOnly || loading}
                        onClick={() => openRow(open.record.id, "edit")}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={readOnly || loading}
                        onClick={() => setDeleteTarget(open.record)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={cancel}>
                        Cancel
                      </Button>
                      <Button size="sm" disabled={!model} onClick={saveChanges}>
                        Save changes
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {storageError && (
                <p role="alert" className="border-destructive/50 text-destructive mb-3 rounded-md border px-3 py-2 text-sm">
                  {storageError}
                </p>
              )}
              {formNote && <div className="text-muted-foreground mb-3 text-xs">{formNote}</div>}
              {loading && (
                <p className="text-muted-foreground mb-2 text-xs" role="status">
                  Loading…
                </p>
              )}
              {/* Only the form: the heading, the actions and the note above are
                  this application's own markup. */}
              <SurveyOutline>
                <SurveyForm
                  key={open.key}
                  schema={schema}
                  schemaId={schemaId}
                  data={open.data}
                  variables={variables}
                  mode={open.mode === "view" ? "display" : "edit"}
                  onComplete={open.mode === "view" ? undefined : handleComplete}
                  pdfInNavigation={false}
                  completeText="Save changes"
                  onModelReady={handleModelReady}
                />
              </SurveyOutline>
            </>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-sm">
              {storageError && (
                <p role="alert" className="text-destructive">
                  {storageError}
                </p>
              )}
              <p>No {noun.many} yet</p>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={readOnly} onClick={startNew}>
                <PlusIcon />
                New {noun.one}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(value) => !value && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {noun.one}?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-medium">
                {deleteTarget ? recordTitle(collection, deleteTarget) : ""}
              </span>
              . This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset demo data?</DialogTitle>
            <DialogDescription>
              This deletes everything you changed in this demo: every record, every edited
              form and every uploaded document, on every page. The page then reloads with the
              data that ships with the template.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={resetData}>
              Reset demo data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discard !== null} onOpenChange={(value) => !value && dismissDiscard()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes to {discard?.title}?</DialogTitle>
            <DialogDescription>
              The answers you changed have not been saved. Discarding puts back the
              last saved version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={dismissDiscard}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const run = discard?.run;
                setDiscard(null);
                run?.();
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
