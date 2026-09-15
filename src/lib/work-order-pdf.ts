import type { SurveyData } from "../schemas/types";
import { TECHNICIANS } from "../schemas/work-order";
import { JOB_SHEET_BOXES, PARTS_ROWS, type SheetBox } from "./work-order-boxes";

/**
 * A work order, printed onto the company's own job sheet.
 *
 * The generic "save this survey as a PDF" export draws the questionnaire; a job
 * sheet needs the opposite, the sheet itself, because that is what a customer
 * signs and an office files. So this fills the blank in `public/samples`: every
 * answer has a box, measured from the sheet's HTML by
 * `scripts/render-work-order-assets.mjs` into `work-order-boxes.ts`, and the
 * values are drawn into those boxes with pdf-lib.
 *
 * Two halves, so the layout can be checked without a browser:
 *
 *  - `layoutWorkOrder(data, measure)` is pure. It decides what goes where: text
 *    wrapped and truncated to its box, the signature scaled into its box, parts
 *    rows spread over as many continuation sheets as they need.
 *  - `exportWorkOrderToPdf(data)` loads pdf-lib and the blank on demand, measures
 *    with the embedded font, draws, and downloads.
 */

const BLANK = "/samples/work-order-blank.pdf";

/** Text sizes, in points. The printer's face is Courier, which pdf-lib embeds as a standard font. */
const SIZE = 9;
const COMMENT_SIZE = 8.5;
const COMMENT_LEADING = 10;
const PARTS_SIZE = 8.5;
const MARK_SIZE = 8;
/** A single-line value too wide for its box shrinks to this before it is truncated. */
const MIN_SIZE = 7;
/** Horizontal room kept between a value and its box's rules. */
const INSET = 3;

/** Courier's ascender and descender, as fractions of the size (from its AFM). */
export const FONT_ASCENT = 0.629;
export const FONT_DESCENT = 0.157;

/** Width of `text` at `size`, in points. The printer passes the embedded font's metrics. */
export type MeasureText = (text: string, size: number) => number;

export interface TextRun {
  readonly kind: "text";
  /** Index of the page in the printed document: 0 is the job sheet, 1 on are continuation sheets. */
  readonly page: number;
  /** The id of the box in `JOB_SHEET_BOXES`. */
  readonly box: string;
  readonly text: string;
  /** Baseline start, in points. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly width: number;
  readonly bold?: boolean;
  /** For a parts cell: the row's index in `data.parts`. */
  readonly row?: number;
}

export interface ImageRun {
  readonly kind: "image";
  readonly page: number;
  readonly box: string;
  readonly dataUrl: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WorkOrderLayout {
  /** The blank's page each printed page copies: 1, then 2 for every continuation sheet. */
  readonly pages: readonly (1 | 2)[];
  readonly runs: readonly (TextRun | ImageRun)[];
}

/* ── text ─────────────────────────────────────────────────────────────────── */

const REPLACEMENTS: Record<string, string> = {
  "−": "-", "‐": "-", "‑": "-", "–": "-", "—": "-",
  "‘": "'", "’": "'", "‚": "'", "“": '"', "”": '"', "„": '"',
  "…": "...", " ": " ", "→": "->", "←": "<-", "\t": " ",
};

/** The few characters above 0xFF that WinAnsi, and so pdf-lib's standard fonts, can encode. */
const WIN_ANSI_EXTRA = new Set("€ƒ†‡ˆ‰Š‹ŒŽ•˜™š›œžŸ");

/**
 * `text` in characters pdf-lib's standard fonts can encode. Dashes and quotes
 * become their ASCII look-alikes; anything else outside WinAnsi becomes `?`,
 * so an unexpected character prints as a mark rather than failing the export.
 */
export function winAnsiSafe(text: string): string {
  let out = "";
  for (const char of text) {
    const replaced = REPLACEMENTS[char];
    if (replaced !== undefined) {
      out += replaced;
      continue;
    }
    const code = char.codePointAt(0)!;
    const encodable =
      code === 10 || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(char);
    out += encodable ? char : "?";
  }
  return out;
}

const ELLIPSIS = "...";

/** `text` when it fits `width`, otherwise its longest start that fits with an ellipsis after it. */
function truncate(text: string, width: number, size: number, measure: MeasureText): string {
  if (measure(text, size) <= width) return text;
  let end = text.length;
  while (end > 0 && measure(`${text.slice(0, end).trimEnd()}${ELLIPSIS}`, size) > width) end--;
  return end > 0 ? `${text.slice(0, end).trimEnd()}${ELLIPSIS}` : "";
}

/** `text` broken into lines no wider than `width`, words first, characters when a word is too long. */
function wrap(text: string, width: number, size: number, measure: MeasureText): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/ +/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      let rest = word;
      while (measure(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

/** The baseline that centres one line of `size` in `box` vertically. */
function centredBaseline(box: SheetBox, size: number): number {
  return box.y + (box.height - (FONT_ASCENT + FONT_DESCENT) * size) / 2 + FONT_DESCENT * size;
}

/* ── values, as the sheet prints them ─────────────────────────────────────── */

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return winAnsiSafe(String(value)).trim();
}

/** `2026-09-14` as MM/DD/YYYY. */
function usDate(value: unknown): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value));
  return match ? `${match[2]}/${match[3]}/${match[1]}` : text(value);
}

/** `1195.25` as `1,195.25`. */
function money(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : text(value);
}

function choiceText(choices: readonly { value: string; text: string }[], value: unknown): string {
  return choices.find((choice) => choice.value === value)?.text ?? text(value);
}

/** Width and height of a PNG data URL, from its IHDR chunk. */
function pngSize(dataUrl: string): { width: number; height: number } | undefined {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match) return undefined;
  const head = atob(match[1].slice(0, 44));
  if (head.length < 24 || head.slice(1, 4) !== "PNG") return undefined;
  const at = (offset: number) =>
    ((head.charCodeAt(offset) << 24) | (head.charCodeAt(offset + 1) << 16) | (head.charCodeAt(offset + 2) << 8) | head.charCodeAt(offset + 3)) >>> 0;
  return { width: at(16), height: at(20) };
}

/* ── layout ───────────────────────────────────────────────────────────────── */

const PART_COLUMNS = ["partNumber", "description", "quantity", "unitPrice", "linePrice"] as const;
const RIGHT_ALIGNED = new Set<string>(["quantity", "unitPrice", "linePrice"]);

/**
 * Where every value of a work order is printed. Pure: no pdf-lib, no DOM.
 * `measure` gives a text's width at a size, in points.
 */
export function layoutWorkOrder(data: SurveyData, measure: MeasureText): WorkOrderLayout {
  const runs: (TextRun | ImageRun)[] = [];
  const boxOf = (id: string): SheetBox => {
    const box = JOB_SHEET_BOXES[id];
    if (!box) throw new Error(`The job sheet has no box "${id}".`);
    return box;
  };

  /** One line: a size smaller if that is what it takes to fit, then truncated. */
  const line = (
    page: number,
    id: string,
    value: string,
    options: { size?: number; align?: "left" | "right" | "center"; bold?: boolean; row?: number; inset?: number } = {},
  ) => {
    const body = value.replace(/\s*\n\s*/g, ", ");
    if (!body) return;
    const box = boxOf(id);
    const room = box.width - 2 * (options.inset ?? INSET);
    let size = options.size ?? SIZE;
    while (size > MIN_SIZE && measure(body, size) > room) size -= 0.5;
    const fitted = truncate(body, room, size, measure);
    if (!fitted) return;
    const width = measure(fitted, size);
    const align = options.align ?? "left";
    const inset = options.inset ?? INSET;
    const x =
      align === "right" ? box.x + box.width - inset - width : align === "center" ? box.x + (box.width - width) / 2 : box.x + inset;
    runs.push({ kind: "text", page, box: id, text: fitted, x, y: centredBaseline(box, size), size, width, bold: options.bold, row: options.row });
  };

  /** Several lines, wrapped to the box; the last one that fits ends in an ellipsis when text is left over. */
  const block = (page: number, id: string, value: string) => {
    if (!value) return;
    const box = boxOf(id);
    const room = box.width - 2 * INSET;
    const lines = wrap(value, room, COMMENT_SIZE, measure);
    const capacity = Math.max(1, Math.floor((box.height - (FONT_ASCENT + FONT_DESCENT) * COMMENT_SIZE) / COMMENT_LEADING) + 1);
    const shown = lines.slice(0, capacity);
    if (lines.length > capacity) {
      // The last line takes the rest of the text, cut short with an ellipsis.
      shown[capacity - 1] = truncate(lines.slice(capacity - 1).join(" "), room, COMMENT_SIZE, measure);
    }
    const top = box.y + box.height - 1 - FONT_ASCENT * COMMENT_SIZE;
    shown.forEach((content, index) => {
      if (!content) return;
      runs.push({
        kind: "text",
        page,
        box: id,
        text: content,
        x: box.x + INSET,
        y: top - index * COMMENT_LEADING,
        size: COMMENT_SIZE,
        width: measure(content, COMMENT_SIZE),
      });
    });
  };

  /** A crossed square. */
  const mark = (page: number, id: string) => {
    // The square is barely wider than the X, so no inset.
    if (JOB_SHEET_BOXES[id]) line(page, id, "X", { size: MARK_SIZE, align: "center", bold: true, inset: 0 });
  };

  // How many sheets: the job sheet, then continuation sheets for rows beyond it.
  const parts = (Array.isArray(data.parts) ? data.parts : []).map((row) =>
    typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {},
  );
  const overflow = Math.max(0, parts.length - PARTS_ROWS.first);
  const continuationSheets = Math.ceil(overflow / PARTS_ROWS.continuation);
  const pages: (1 | 2)[] = [1, ...Array.from({ length: continuationSheets }, () => 2 as const)];
  const sheetCount = String(pages.length);

  const jobNumber = text(data.jobNumber);
  line(0, "jobNumber", jobNumber);
  line(0, "sheetNumber", "1", { align: "center" });
  line(0, "sheetCount", sheetCount, { align: "center" });

  // 1 Job
  line(0, "visitDate", usDate(data.visitDate));
  line(0, "arrivalTime", text(data.arrivalTime));
  line(0, "departureTime", text(data.departureTime));
  line(0, "hoursOnSite", text(data.hoursOnSite));
  if (typeof data.status === "string") mark(0, `status.${data.status}`);

  // 2 Customer and site
  line(0, "customerName", text(data.customerName));
  line(0, "purchaseOrder", text(data.purchaseOrder));
  block(0, "siteAddress", text(data.siteAddress));
  block(0, "contactName", text(data.contactName));
  line(0, "contactPhone", text(data.contactPhone));

  // 3 Equipment
  if (typeof data.equipmentType === "string") mark(0, `equipmentType.${data.equipmentType}`);
  if (typeof data.warranty === "boolean") mark(0, `warranty.${data.warranty ? "yes" : "no"}`);
  line(0, "manufacturer", text(data.manufacturer));
  line(0, "modelNumber", text(data.modelNumber));
  line(0, "serialNumber", text(data.serialNumber));
  line(0, "installedOn", usDate(data.installedOn));

  // 4 Work
  block(0, "faultReported", text(data.faultReported));
  block(0, "workPerformed", text(data.workPerformed));
  if (typeof data.outcome === "string") mark(0, `outcome.${data.outcome}`);
  block(0, "followUpNotes", text(data.followUpNotes));

  // 5 Parts and labor: every row once, in order, on the first sheet with room.
  parts.forEach((row, index) => {
    const onFirst = index < PARTS_ROWS.first;
    const offset = index - PARTS_ROWS.first;
    const page = onFirst ? 0 : 1 + Math.floor(offset / PARTS_ROWS.continuation);
    const slot = onFirst ? index : offset % PARTS_ROWS.continuation;
    const prefix = onFirst ? "parts" : "continued.parts";
    for (const column of PART_COLUMNS) {
      const value = column === "unitPrice" || column === "linePrice" ? money(row[column]) : text(row[column]);
      line(page, `${prefix}.${slot}.${column}`, value, {
        size: PARTS_SIZE,
        align: RIGHT_ALIGNED.has(column) ? "right" : "left",
        row: index,
      });
    }
  });
  line(0, "partsTotal", money(data.partsTotal));
  line(0, "laborHours", text(data.laborHours));
  line(0, "laborRate", money(data.laborRate));
  line(0, "laborTotal", money(data.laborTotal));
  line(0, "total", money(data.total), { bold: true });

  // 6 Sign-off
  line(0, "technicianName", choiceText(TECHNICIANS, data.technicianName));
  line(0, "signedByName", text(data.signedByName));
  line(0, "signedAt", usDate(data.signedAt));

  const signature = typeof data.customerSignature === "string" ? data.customerSignature : "";
  const source = Array.isArray(data.sourceDocument) ? (data.sourceDocument[0] as { name?: unknown } | undefined) : undefined;
  if (signature.startsWith("data:image/")) {
    const box = boxOf("customerSignature");
    const room = { width: box.width - 2 * INSET, height: box.height - 2 * INSET };
    const natural = pngSize(signature) ?? room;
    const scale = Math.min(room.width / natural.width, room.height / natural.height);
    const width = natural.width * scale;
    const height = natural.height * scale;
    runs.push({
      kind: "image",
      page: 0,
      box: "customerSignature",
      dataUrl: signature,
      x: box.x + INSET,
      y: box.y + (box.height - height) / 2,
      width,
      height,
    });
  } else if (source) {
    // The ink is on the paper the record was read from, which the record links.
    const read = text(data.importedAt).replace("T", " ");
    block(0, "customerSignature", `Signed on the original: ${text(source.name)}${read ? `, read ${read} UTC` : ""}`);
  }

  // Every continuation sheet repeats the job number and says which sheet it is.
  for (let page = 1; page < pages.length; page++) {
    line(page, "continued.jobNumber", jobNumber);
    line(page, "continued.sheetNumber", String(page + 1), { align: "center" });
    line(page, "continued.sheetCount", sheetCount, { align: "center" });
  }

  return { pages, runs };
}

/* ── printing ─────────────────────────────────────────────────────────────── */

function bytesOfDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/** The job sheet for one work order, as PDF bytes. `blank` is `work-order-blank.pdf`. */
export async function renderWorkOrderPdf(data: SurveyData, blank: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.load(blank);
  const font = await doc.embedFont(StandardFonts.Courier);
  const bold = await doc.embedFont(StandardFonts.CourierBold);
  const ink = rgb(0.06, 0.09, 0.16);

  const layout = layoutWorkOrder(data, (value, size) => font.widthOfTextAtSize(value, size));

  // The blank carries one continuation sheet: dropped when no row needs it,
  // copied when more than one does.
  const continuation = layout.pages.length - 1;
  if (continuation === 0) {
    doc.removePage(1);
  } else if (continuation > 1) {
    const source = await PDFDocument.load(blank);
    for (let index = 1; index < continuation; index++) {
      const [copy] = await doc.copyPages(source, [1]);
      doc.addPage(copy);
    }
  }
  const pages = doc.getPages();

  for (const run of layout.runs) {
    const page = pages[run.page];
    if (run.kind === "text") {
      page.drawText(run.text, { x: run.x, y: run.y, size: run.size, font: run.bold ? bold : font, color: ink });
    } else {
      const bytes = bytesOfDataUrl(run.dataUrl);
      const image = run.dataUrl.startsWith("data:image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      page.drawImage(image, { x: run.x, y: run.y, width: run.width, height: run.height });
    }
  }
  return doc.save();
}

function fileNameFor(jobNumber: unknown): string {
  const slug = text(jobNumber)
    .toLowerCase()
    .replace(/[^\w-]+/g, "-")
    .replace(/^-|-$/g, "");
  return `job-sheet-${slug || "work-order"}.pdf`;
}

/**
 * Print a work order onto the job sheet and hand the browser the file.
 *
 * `data` is the survey's own answers, keyed by question name: the same object
 * the extractor produces and the records list stores. pdf-lib and the blank
 * reach the browser only when somebody asks for a file.
 */
export async function exportWorkOrderToPdf(data: SurveyData): Promise<void> {
  const response = await fetch(BLANK);
  if (!response.ok) throw new Error("Could not load the blank job sheet.");
  const bytes = await renderWorkOrderPdf(data, await response.arrayBuffer());
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileNameFor(data.jobNumber);
  link.click();
  URL.revokeObjectURL(url);
}
