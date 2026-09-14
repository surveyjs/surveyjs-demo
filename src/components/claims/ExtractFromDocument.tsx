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
import type { SurveyData } from "@/schemas";
import { sampleDocuments, type SampleDocument } from "./sample-documents";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp";

/** Which document this browser has already had read, if any. */
const USED_KEY = "sjs-demo-claim-extracted";

/** What is written there when the document was the visitor's own upload. */
const UPLOAD_ID = "your-document";

interface Outcome {
  readonly tone: "ok" | "error";
  readonly message: string;
}

/**
 * "Add a claim from paper" - the way into the records list that does not
 * involve retyping.
 *
 * A claim still arrives as a PDF from billing software, or as a scan of the
 * printed form, more often than anyone would like. This strip hands the
 * document and the survey's own JSON to `/api/extract`, and what comes back is
 * kept as a draft claim: the answers land in the real inputs, with the real
 * validation and the real conditional logic, for a person to correct. Nothing
 * is accepted blindly, which is the whole design.
 *
 * Two documents ship with the template - the same CMS-1500, once as a digital
 * PDF and once as a scan - so the field-for-field mapping can be seen in one
 * click, on both kinds of input. Any other CMS-1500 can be dropped in too.
 *
 * The key lives on the server, so until one is configured the route answers 501
 * and that is what shows up here - wired, not pretending.
 */
export function ExtractFromDocument({
  formId,
  onExtracted,
}: {
  formId: string;
  /** Answers keyed by question name, straight into the claim on screen. */
  onExtracted: (data: SurveyData) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [enlarged, setEnlarged] = useState<SampleDocument | null>(null);
  const [zoomed, setZoomed] = useState(false);
  // One reading per browser: every extraction is a real call to a paid model,
  // and a demo does not need a second one to make its point. The document that
  // was read stays on screen, marked, and the other ways in go away.
  const [used, setUsed] = useState<string | null>(null);

  useEffect(() => {
    try {
      setUsed(window.localStorage.getItem(USED_KEY));
    } catch {
      // A browser that refuses storage just gets the buttons back.
    }
  }, []);

  const spend = useCallback((id: string) => {
    setUsed(id);
    try {
      window.localStorage.setItem(USED_KEY, id);
    } catch {
      // Nothing to do: the lock is a courtesy, not a security boundary.
    }
  }, []);

  const extract = useCallback(
    async (file: File, label: string, id: string) => {
      setBusy(label);
      setOutcome(null);

      try {
        const body = new FormData();
        body.set("file", file);
        body.set("formId", formId);

        const response = await fetch("/api/extract", { method: "POST", body });
        const payload = (await response.json()) as {
          data?: SurveyData;
          error?: string;
        };

        if (!response.ok || !payload.data) {
          setOutcome({
            tone: "error",
            message: payload.error ?? `Extraction failed (${response.status}).`,
          });
          return;
        }

        const filled = Object.values(payload.data).filter(
          (value) => value !== null && value !== undefined && value !== "",
        ).length;
        onExtracted(payload.data);
        spend(id);
        setOutcome({
          tone: "ok",
          message: `New draft claim: ${filled} field${filled === 1 ? "" : "s"} filled from ${label}. Check them against the document.`,
        });
      } catch (failure) {
        setOutcome({ tone: "error", message: (failure as Error).message });
      } finally {
        setBusy(null);
      }
    },
    [formId, onExtracted, spend],
  );

  const fillFromSample = useCallback(
    async (sample: SampleDocument) => {
      setBusy(sample.label);
      setOutcome(null);
      try {
        const response = await fetch(sample.file);
        const blob = await response.blob();
        const name = sample.file.split("/").pop() ?? "claim";
        await extract(
          new File([blob], name, { type: blob.type }),
          sample.label,
          sample.id,
        );
      } catch (failure) {
        setOutcome({ tone: "error", message: (failure as Error).message });
        setBusy(null);
      }
    },
    [extract],
  );

  // Once a document has been read, it is the only one still on the page.
  const visible = used
    ? sampleDocuments.filter((sample) => sample.id === used)
    : sampleDocuments;

  return (
    <Card className="mt-6 gap-4 p-4">
      <div>
        <h2 className="text-base font-semibold">
          Add a new claim from a filled document (PDF or scan)
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {used
            ? "This browser has had its reading: the document below is the one that was read, and the claim it produced is in the list. Reading costs a call to a paid model, so a demo does one."
            : "Pick a document below: the survey's own JSON tells the model which CMS-1500 box each answer comes from, and the claim arrives in the list as a draft, open beside it in the real inputs for you to check against the document."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((sample) => {
          const loading = busy === sample.label;
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
                  alt={`${sample.label} - a filled CMS-1500 claim form`}
                  width={sample.previewWidth}
                  height={sample.previewHeight}
                  sizes="(min-width: 640px) 300px, 90vw"
                  className="h-40 w-full object-cover object-top transition-opacity hover:opacity-80"
                />
                <Badge
                  variant="secondary"
                  className="bg-background/90 absolute top-2 left-2 backdrop-blur"
                >
                  {sample.kind}
                </Badge>
                {used === sample.id && (
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
                {used ? (
                  <p className="text-muted-foreground mt-auto flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs">
                    <CheckIcon className="size-3.5" />
                    Already read into a claim
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

      {used === UPLOAD_ID && (
        <p className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
          <CheckIcon className="size-3.5" />
          Read from a document of your own.
        </p>
      )}

      {!used && (
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <span className="text-muted-foreground min-w-0 flex-1 text-sm">
            Or try it with a CMS-1500 of your own - a PDF, a scan or a photo.
            <span className="mt-1 block text-xs">
              Supported formats: PDF, PNG, JPG, WEBP. Up to 8 MB.
            </span>
            <span className="mt-1 block text-xs">
              This is a demo, not a service. The file is sent to an LLM provider
              for this one reading and is not stored here, and the claim it
              produces lives in this demo&apos;s memory until the server restarts
              - so please upload sample or made-up forms, never real patient data.
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
              if (file) void extract(file, file.name, UPLOAD_ID);
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
                alt={`${enlarged.label} - a filled CMS-1500 claim form`}
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
