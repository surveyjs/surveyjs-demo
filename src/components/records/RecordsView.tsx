"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FileDownIcon, PlusIcon } from "lucide-react";
import type { Model } from "survey-core";
import {
  getRecordCollection,
  getSchemaDefinition,
  recordTitle,
  sortRows,
  type RecordColumn,
  type RecordColumns,
  type RecordRow,
  type SessionUser,
  type SourceDocument,
  type StoredRecord,
  type SurveyData,
  type SurveyJSON,
} from "@/schemas";
import { deleteResult, getResult, saveResult } from "@/storage/survey-results";
import { features } from "@/features";
import { configureHref } from "@/lib/routes";
import { mergeTailwindClasses, stableJson } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { SurveyForm } from "@/components/SurveyForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

/** Badge tones as classes. The collection names a tone; only this file knows CSS. */
const TONE_CLASSES: Record<NonNullable<RecordColumn["tones"]>[string], string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300 dark:bg-sky-400/15",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-400/15",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-400/15",
  danger: "bg-destructive/15 text-destructive dark:text-red-300 dark:bg-red-400/15",
};

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function Cell({ column, columns }: { column: RecordColumn; columns: RecordColumns }) {
  const value = columns[column.key];
  if (isEmpty(value)) return <>—</>;

  switch (column.kind) {
    case "badge": {
      const label = column.labels?.[String(value)];
      return (
        <Badge
          variant="secondary"
          className={mergeTailwindClasses(
            !label && "capitalize",
            TONE_CLASSES[column.tones?.[String(value)] ?? "neutral"],
          )}
        >
          {label ?? String(value).replace(/_/g, " ")}
        </Badge>
      );
    }
    case "money": {
      if (typeof value !== "number") return <>{String(value)}</>;
      const code = column.currencyKey ? columns[column.currencyKey] : undefined;
      const currency = typeof code === "string" && code ? code : "USD";
      return <>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)}</>;
    }
    case "date":
      // UTC, so an ISO date is the same day on the server and in every browser.
      return (
        <>
          {new Date(String(value)).toLocaleDateString("en-US", {
            dateStyle: "medium",
            timeZone: "UTC",
          })}
        </>
      );
    default:
      return <>{String(value)}</>;
  }
}

const RIGHT_ALIGNED: ReadonlySet<RecordColumn["kind"]> = new Set(["money"]);

/**
 * A records page: a list of stored records, and one form that views, edits and
 * adds them.
 *
 * Everything page-specific is data in the collection (`src/schemas/records.ts`):
 * the columns, how they derive from a response, the id and the defaults of a
 * new record. The list shows columns only; opening a row fetches its document.
 * Saving writes the document and puts back the columns storage derived from it,
 * never columns computed here.
 *
 * It subscribes to no SurveyJS event. It reads `model.data`, calls
 * `model.toJSON()`, `model.validate()` and `model.completeLastPage()`, and gets
 * saves through `SurveyForm`'s `onComplete`.
 */
export function RecordsView({
  collectionId,
  title,
  description,
  initialRows,
  initialRecord,
  users = [],
  exportPdf,
  listFooter,
  formNote,
  layout = "split",
}: {
  collectionId: string;
  /** The nav label, for the page header. */
  title: string;
  description: string;
  initialRows: readonly RecordRow[];
  /** The first row's document, read on the server. */
  initialRecord: StoredRecord | undefined;
  /** From `listSessionUsers`. Fewer than two renders no switcher. */
  users?: readonly SessionUser[];
  /** Replaces the generic PDF export for this collection (Work orders: the job sheet). */
  exportPdf?: (data: SurveyData) => void | Promise<void>;
  /**
   * Rendered under the list (Work orders: extraction from a document).
   * `createFrom` stores a new record made from answers read off `source`, and opens it.
   */
  listFooter?: (api: {
    createFrom: (data: SurveyData, source?: SourceDocument) => Promise<void>;
  }) => ReactNode;
  /** One or two sentences under the form column's heading. */
  formNote?: ReactNode;
  /**
   * "split": the list beside the form, from `lg`. "stacked": the list
   * above a full-width form, for a definition built on wide matrices. Beside the
   * list the form is narrower than the theme's `--sd-mobile-width` (640px in the
   * shadcn adapter) at every common laptop width, and survey-core then renders
   * each matrix row as a stacked card.
   */
  layout?: "split" | "stacked";
}) {
  const collection = getRecordCollection(collectionId);
  const { schemaId, noun } = collection;
  const schema = getSchemaDefinition(schemaId).json;

  const [rows, setRows] = useState<RecordRow[]>(() => [...initialRows]);
  const [open, setOpen] = useState<OpenRecord | null>(() =>
    initialRecord
      ? { mode: "view", record: initialRecord, data: initialRecord.data, key: 0 }
      : null,
  );
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecordRow | null>(null);
  const [discard, setDiscard] = useState<{ title: string; run: () => void } | null>(null);
  const [activeUserId, setActiveUserId] = useState(users[0]?.id);
  const formColumn = useRef<HTMLDivElement>(null);

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

  const activeUser = users.find((user) => user.id === activeUserId) ?? users[0];
  const variables = useMemo(() => (activeUser ? { user: activeUser } : undefined), [activeUser]);

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

  const nextKey = (prev: OpenRecord | null) => (prev?.key ?? 0) + 1;

  const openTitle = (current: OpenRecord) =>
    current.mode === "new" ? `the new ${noun.one}` : recordTitle(collection, current.record);

  /** Runs `action`, or first asks, when the open form has changes nobody saved. */
  const guard = useCallback(
    (action: () => void) => {
      const current = openRef.current;
      const form = modelRef.current;
      const changed =
        current !== null &&
        current.mode !== "view" &&
        form !== null &&
        snapshot.current !== null &&
        stableJson(form.data as SurveyData) !== snapshot.current;
      if (changed) {
        setDiscard({ title: openTitle(current), run: action });
      } else {
        action();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionId],
  );

  /* ── opening ─────────────────────────────────────────────────────────────── */

  const request = useRef(0);

  const show = useCallback((mode: "view" | "edit", record: StoredRecord) => {
    setOpen((prev) => ({ mode, record, data: record.data, key: nextKey(prev) }));
  }, []);

  const openRow = useCallback(
    (id: string, mode: "view" | "edit") =>
      guard(() => {
        const current = openRef.current;
        if (current && current.mode !== "new" && current.record.id === id) {
          request.current++;
          setLoading(false);
          show(mode, current.record);
          return;
        }
        const ticket = ++request.current;
        setLoading(true);
        void getResult(collectionId, id).then((record) => {
          if (ticket !== request.current) return;
          setLoading(false);
          if (record) show(mode, record);
        });
      }),
    [collectionId, guard, show],
  );

  const startNew = useCallback(
    () =>
      guard(() => {
        request.current++;
        setLoading(false);
        const id = collection.newId(rowsRef.current.map((row) => row.id));
        const data = collection.newRecord(id, activeUser);
        setOpen((prev) => ({
          mode: "new",
          record: { id, columns: collection.toColumns(id, data), data },
          data,
          key: nextKey(prev),
          previous: prev?.mode === "new" ? prev.previous : prev?.record,
        }));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionId, guard, activeUser],
  );

  const cancel = useCallback(
    () =>
      guard(() => {
        const current = openRef.current;
        if (!current) return;
        const back = current.mode === "new" ? current.previous : current.record;
        if (back) show("view", back);
        else setOpen(null);
      }),
    [guard, show],
  );

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
      const saved = await saveResult(collectionId, current.record.id, data);
      upsertRow(saved);
      show("view", saved);
    },
    [collectionId, show, upsertRow],
  );

  // The header's Save checks every page, not only the one on screen:
  // `completeLastPage` alone validates the current page and would store a record
  // with errors on another. `validate` switches to the first page with one.
  const saveChanges = useCallback(() => {
    if (!model) return;
    if (model.validate(true, true, undefined, true)) model.completeLastPage();
  }, [model]);

  const createFrom = useCallback(
    async (extracted: SurveyData, source?: SourceDocument) => {
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
      const saved = await saveResult(collectionId, id, document);
      upsertRow(saved);
      guard(() => {
        show("edit", saved);
        requestAnimationFrame(() =>
          formColumn.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionId, activeUser, guard, show, upsertRow],
  );

  const confirmDelete = useCallback(async () => {
    const target = deleteTarget;
    if (!target) return;
    await deleteResult(collectionId, target.id);
    const remaining = rowsRef.current.filter((row) => row.id !== target.id);
    setRows(remaining);
    setDeleteTarget(null);
    // The form is always open on some record, so deleting the open one falls
    // back to whatever is left.
    const current = openRef.current;
    if (current && current.mode !== "new" && current.record.id === target.id) {
      const next = remaining[0];
      if (!next) {
        setOpen(null);
        return;
      }
      const record = await getResult(collectionId, next.id);
      if (record) show("view", record);
    }
  }, [collectionId, deleteTarget, show]);

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

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        configureHref={configureHref(schemaId)}
        analyticsHref={features.analyticsHref?.(schemaId)}
        actions={
          <>
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
          </>
        }
      />

      <div
        className={mergeTailwindClasses(
          "grid items-start gap-6",
          layout === "split" && "lg:grid-cols-2",
        )}
      >
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              {rows.length} {rows.length === 1 ? noun.one : noun.many}
            </h2>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={startNew}>
              <PlusIcon />
              New {noun.one}
            </Button>
          </div>
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {collection.columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={RIGHT_ALIGNED.has(column.kind) ? "text-right" : undefined}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={collection.columns.length + 1}
                      className="text-muted-foreground py-10 text-center"
                    >
                      No records left.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => {
                  const active = open?.mode !== "new" && open?.record.id === row.id;
                  return (
                    <TableRow
                      key={row.id}
                      data-state={active ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => openRow(row.id, "view")}
                    >
                      {collection.columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={mergeTailwindClasses(
                            column.kind === "id" && "font-mono",
                            RIGHT_ALIGNED.has(column.kind) && "text-right",
                          )}
                        >
                          <Cell column={column} columns={row.columns} />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              openRow(row.id, "edit");
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(row);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {listFooter?.({ createFrom })}
        </div>

        {open && (
          <div
            ref={formColumn}
            className={mergeTailwindClasses("min-w-0", layout === "split" && "lg:sticky lg:top-20")}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{heading}</h2>
              <div className="flex gap-2">
                {open.mode === "view" ? (
                  <Button size="sm" variant="outline" onClick={() => openRow(open.record.id, "edit")}>
                    Edit
                  </Button>
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
            {formNote && <div className="text-muted-foreground mb-3 text-xs">{formNote}</div>}
            {loading && (
              <p className="text-muted-foreground mb-2 text-xs" role="status">
                Loading…
              </p>
            )}
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
          </div>
        )}
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

      <Dialog open={discard !== null} onOpenChange={(value) => !value && setDiscard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes to {discard?.title}?</DialogTitle>
            <DialogDescription>
              The answers you changed have not been saved. Discarding puts back the
              last saved version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscard(null)}>
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
