"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CheckIcon,
  DownloadIcon,
  Loader2Icon,
  ScanTextIcon,
  UploadIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SourceDocument, SurveyData } from "@/schemas";
import { keepSourceDocument } from "@/storage/documents";
import type { SampleDocument } from "./sample-documents";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp";

/** Which documents this browser has already had read for a form: a JSON array of ids. */
const usedKey = (formId: string) => `sjs-demo-extracted:${formId}`;

/** What is written there when the document was the visitor's own upload. */
const UPLOAD_ID = "your-document";

/** The ids in storage. A bare id is what the one-reading-per-form lock used to write. */
function parseUsed(stored: string | null): string[] {
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    // Not JSON: the old format.
  }
  return [stored];
}

interface Outcome {
  readonly tone: "ok" | "error";
  readonly message: string;
}

/** "a job sheet", "an invoice". */
function withArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

/**
 * "Add a record from paper": the way into a records list that does not involve
 * retyping.
 *
 * Paperwork still arrives as a PDF out of another system, or as a scan or a
 * phone photo of a sheet filled in by hand, more often than anyone would like.
 * This strip hands the document and the survey's own JSON to `/api/extract`,
 * and what comes back is kept as a draft record: the answers land in the real
 * inputs, with the real validation and the real conditional logic, for a person
 * to correct against the original, which the record links. Nothing is accepted
 * blindly, which is the whole design.
 *
 * The samples ship with the template, so the field-for-field mapping can be seen
 * in one click on each kind of input. Any other document of the same kind can
 * be dropped in too.
 *
 * The key lives on the server, so until one is configured the route answers 501
 * and that is what shows up here: wired, not pretending.
 */
export function ExtractFromDocument({
  formId,
  noun,
  documentName,
  samples,
  onExtracted,
  onBusyChange,
}: {
  formId: string;
  /** What a record is called, in the singular: "work order". */
  noun: string;
  /** What the paper is called, in the singular: "job sheet". */
  documentName: string;
  samples: readonly SampleDocument[];
  /** Answers keyed by question name, and the original they were read from. */
  onExtracted: (data: SurveyData, source: SourceDocument) => void | Promise<void>;
  /** Called whenever a reading starts or ends, so the page can hold the visitor on this panel. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    onBusyChange?.(busy !== null);
  }, [busy, onBusyChange]);

  // Leaving the page while a document is being read abandons that reading: a
  // result that arrives after this unmounts adds no record and spends nothing.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [enlarged, setEnlarged] = useState<SampleDocument | null>(null);
  const [zoomed, setZoomed] = useState(false);
  // One reading per document, per browser and form: every extraction is a real
  // call to a paid model, and reading the same sheet twice proves nothing new. A
  // document that was read stays on screen, marked; the others stay loadable, so
  // the PDF, the photo and the scan can each be compared once. The upload has
  // its own one reading.
  const [used, setUsed] = useState<readonly string[]>([]);

  useEffect(() => {
    try {
      setUsed(parseUsed(window.localStorage.getItem(usedKey(formId))));
    } catch {
      // A browser that refuses storage just gets the buttons back.
    }
  }, [formId]);

  const spend = useCallback(
    (id: string) => {
      setUsed((current) => (current.includes(id) ? current : [...current, id]));
      try {
        const stored = parseUsed(window.localStorage.getItem(usedKey(formId)));
        if (!stored.includes(id)) {
          window.localStorage.setItem(usedKey(formId), JSON.stringify([...stored, id]));
        }
      } catch {
        // Nothing to do: the lock is a courtesy, not a security boundary.
      }
    },
    [formId],
  );

  const extract = useCallback(
    async (
      file: File,
      origin: File | { url: string; name: string; type: string },
      label: string,
      id: string,
    ) => {
      setBusy(label);
      setOutcome(null);

      try {
        const body = new FormData();
        body.set("file", file);
        body.set("formId", formId);

        const response = await fetch("/api/extract", { method: "POST", body });
        const payload = (await response.json()) as {
          data?: SurveyData;
          readAt?: string;
          error?: string;
        };
        if (!mounted.current) return;

        if (!response.ok || !payload.data) {
          setOutcome({
            tone: "error",
            message: payload.error ?? `Extraction failed (${response.status}).`,
          });
          return;
        }
        if (!payload.readAt) {
          setOutcome({ tone: "error", message: "The server did not say when it read the document." });
          return;
        }

        // A sample keeps its public URL. An upload gets an object URL, which lives
        // exactly as long as this tab's in-memory records: both are gone on reload,
        // so the link never outlives the record that points at it.
        const source = await keepSourceDocument(origin, payload.readAt);
        if (!mounted.current) return;
        const filled = Object.values(payload.data).filter(
          (value) => value !== null && value !== undefined && value !== "",
        ).length;
        // Opening the new record closes the panel, so this component is gone by
        // the time the reading is marked as spent below; that is expected, and
        // the mark is still written.
        await onExtracted(payload.data, source);
        spend(id);
        setOutcome({
          tone: "ok",
          message: `New draft ${noun}: ${filled} field${filled === 1 ? "" : "s"} filled from ${label}. Check them against the document.`,
        });
      } catch (failure) {
        setOutcome({ tone: "error", message: (failure as Error).message });
      } finally {
        setBusy(null);
      }
    },
    [formId, noun, onExtracted, spend],
  );

  const fillFromSample = useCallback(
    async (sample: SampleDocument) => {
      setBusy(sample.label);
      setOutcome(null);
      try {
        const response = await fetch(sample.file);
        const blob = await response.blob();
        const name = sample.file.split("/").pop() ?? documentName;
        const file = new File([blob], name, { type: blob.type });
        await extract(file, { url: sample.file, name, type: blob.type }, sample.label, sample.id);
      } catch (failure) {
        setOutcome({ tone: "error", message: (failure as Error).message });
        setBusy(null);
      }
    },
    [documentName, extract],
  );

  const uploaded = used.includes(UPLOAD_ID);

  return (
    <Card className="gap-4 p-4">
      <div>
        <h2 className="text-base font-semibold">
          Add {withArticle(noun)} from a filled {documentName} (PDF, scan or photo)
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick a document below: the survey&apos;s own JSON tells the model which box on the{" "}
          {documentName} each answer comes from. The {noun} arrives in the list as a draft, open
          in the real inputs for you to check against the document, which it links as its
          original.
          {used.length > 0 &&
            " Each document is read once in this browser, because reading costs a call to a paid model; what was already read is marked below, and its draft is in the list."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {samples.map((sample) => {
          const loading = busy === sample.label;
          const read = used.includes(sample.id);
          return (
            <div
              key={sample.id}
              className="bg-muted/30 flex flex-col overflow-hidden rounded-lg border"
            >
              <button
                type="button"
                onClick={() => {
                  setZoomed(false);
                  setEnlarged(sample);
                }}
                aria-label={`Open ${sample.label} (${sample.kind}) full size`}
                className="focus-visible:ring-ring/50 relative block cursor-zoom-in overflow-hidden border-b focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <Image
                  src={sample.preview}
                  alt={`${sample.label} - a filled ${documentName}`}
                  width={sample.previewWidth}
                  height={sample.previewHeight}
                  sizes="(min-width: 640px) 33vw, 90vw"
                  className="h-40 w-full object-cover object-top transition-opacity hover:opacity-80"
                />
                <Badge
                  variant="secondary"
                  className="bg-background/90 absolute top-2 left-2 backdrop-blur"
                >
                  {sample.kind}
                </Badge>
                {read && (
                  <Badge className="absolute top-2 right-2 gap-1">
                    <CheckIcon className="size-3" />
                    Loaded
                  </Badge>
                )}
                {loading && (
                  <span className="bg-background/70 absolute inset-0 flex items-center justify-center">
                    <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
                  </span>
                )}
              </button>

              <div className="flex flex-1 flex-col gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{sample.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {sample.summary}
                  </p>
                </div>
                {read ? (
                  <p className="text-muted-foreground mt-auto flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs">
                    <CheckIcon className="size-3.5" />
                    Already read into {withArticle(noun)}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-auto w-full gap-2"
                    disabled={busy !== null}
                    onClick={() => void fillFromSample(sample)}
                  >
                    {loading ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <ScanTextIcon />
                    )}
                    {sample.action}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {uploaded && (
        <p className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
          <CheckIcon className="size-3.5" />
          Read from a document of your own.
        </p>
      )}

      {!uploaded && (
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <span className="text-muted-foreground min-w-0 flex-1 text-sm">
            Or try it with {withArticle(documentName)} of your own: a PDF, a scan or a photo.
            <span className="mt-1 block text-xs">
              Supported formats: PDF, PNG, JPG, WEBP. Up to 8 MB.
            </span>
            <span className="mt-1 block text-xs">
              This is a demo, not a service. The file is sent to an LLM provider
              for this one reading. The new {noun} links it as its original in
              this browser tab only, until the page is reloaded, and nothing is
              stored on the server. Please upload sample or made-up documents,
              never real customer data.
            </span>
          </span>

          <input
            ref={input}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void extract(file, file, file.name, UPLOAD_ID);
            }}
          />

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={busy !== null}
            onClick={() => input.current?.click()}
          >
            <UploadIcon />
            Add from your document
          </Button>
        </div>
      )}

      {outcome && (
        <p
          className={
            outcome.tone === "ok"
              ? "text-muted-foreground text-xs"
              : "text-destructive text-xs"
          }
        >
          {outcome.message}
        </p>
      )}

      {/* The thumbnail is too small to read the boxes in, and reading them is
          the point: the same picture, full size, is what makes the extracted
          answers checkable. */}
      <Dialog
        open={enlarged !== null}
        onOpenChange={(open) => !open && setEnlarged(null)}
      >
        <DialogContent className="sm:max-w-[min(95vw,1100px)]">
          <DialogHeader className="pr-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle>{enlarged?.label}</DialogTitle>
                <DialogDescription>
                  {enlarged?.kind} - click the page to zoom
                </DialogDescription>
              </div>
              {enlarged && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={enlarged.file} download>
                    <DownloadIcon />
                    Download original
                  </a>
                </Button>
              )}
            </div>
          </DialogHeader>
          {enlarged && (
            // A whole sheet of paper scaled into one screen is exactly what
            // cannot be read, so the page fits the dialog's width and scrolls -
            // and a click puts it at its own size, boxes legible, scrolling both
            // ways.
            <div className="max-h-[75vh] overflow-auto rounded-md border">
              <Image
                src={enlarged.full}
                alt={`${enlarged.label} - a filled ${documentName}`}
                width={enlarged.fullWidth}
                height={enlarged.fullHeight}
                unoptimized
                onClick={() => setZoomed((on) => !on)}
                style={zoomed ? { width: enlarged.fullWidth } : undefined}
                className={
                  zoomed
                    ? "h-auto max-w-none cursor-zoom-out"
                    : "h-auto w-full cursor-zoom-in"
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
