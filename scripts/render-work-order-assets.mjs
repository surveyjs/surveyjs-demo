#!/usr/bin/env node
/**
 * Renders every Work orders asset from committed source, in Chromium.
 *
 *   npx playwright install chromium   # once, if Playwright has no browser yet
 *   npm run assets:work-order
 *
 * The source is `assets/work-order/`: `job-sheet.html` (the sheet, with inline
 * CSS), the OFL fonts it uses, `signatures.json` (invented signatures as pen
 * strokes) and `samples/<job>.json` (the values written on each sample sheet, in
 * the definition's data shape). From them it writes:
 *
 *  - `public/samples/work-order-blank.pdf`: the blank job sheet and its
 *    continuation sheet, which "Save as PDF" prints a record onto;
 *  - `src/lib/work-order-boxes.ts`: every `data-box` rectangle, measured from the
 *    rendered DOM, in PDF points from the bottom left, and the ruled-row count
 *    of each parts table;
 *  - `src/schemas/data/work-order-signatures.ts`: the signatures as PNG data URLs,
 *    for the seed records entered on a tablet;
 *  - the extractor's sample documents, `work-order-0130.pdf`,
 *    `work-order-0131-photo.jpg`, `work-order-0132-scan.jpg`, their `previews/`,
 *    and `work-order-0120-scan.jpg`, the signed original seed record 0120 links.
 *
 * The photo and scan effects are CSS transforms and filters and an SVG noise
 * layer with a fixed seed, captured with `page.screenshot`: no image library.
 * Chromium stamps a PDF with the time it was printed, so every PDF is passed
 * through pdf-lib with its dates and producer pinned, and a second run writes the
 * same bytes.
 *
 * Node ESM, no dependencies beyond `@playwright/test` and `pdf-lib`, which the
 * template already has.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "assets", "work-order");
const SAMPLES_OUT = path.join(ROOT, "public", "samples");
const PREVIEWS_OUT = path.join(SAMPLES_OUT, "previews");
const SHEET_URL = pathToFileURL(path.join(ASSETS, "job-sheet.html")).href;

/** CSS pixels are 1/96 in, PDF points 1/72 in. */
const PT_PER_PX = 0.75;
const SHEET = { widthPx: 816, heightPx: 1056, widthPt: 612, heightPt: 792 };
/** Every PDF this script writes carries this date instead of the time it ran. */
const PINNED_DATE = new Date("2026-09-15T00:00:00Z");

/** The technician choices' text, as `src/schemas/work-order.ts` lists them. */
const TECHNICIAN_NAMES = {
  tomasHartley: "Tomas Hartley",
  gracePellerin: "Grace Pellerin",
  nadiaSokolov: "Nadia Sokolov",
};

const INK = "#1d3470";

/* ── formatting: what a person writes in each box ─────────────────────────── */

function usDate(iso, hand) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return "";
  const [, y, m, d] = match;
  return hand ? `${Number(m)}/${Number(d)}/${y.slice(2)}` : `${m}/${d}/${y}`;
}

function money(value, hand) {
  if (typeof value !== "number") return "";
  return hand
    ? value.toFixed(2)
    : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function plain(value) {
  return value === undefined || value === null ? "" : String(value);
}

/** The sheet's boxes for one record: texts by box id, and the boxes to cross. */
function sheetValues(data, hand) {
  const texts = {};
  const put = (id, text) => {
    if (text !== "") texts[id] = text;
  };
  for (const id of [
    "jobNumber", "customerName", "purchaseOrder", "contactName", "contactPhone", "siteAddress",
    "manufacturer", "modelNumber", "serialNumber", "faultReported", "workPerformed",
    "followUpNotes", "signedByName", "arrivalTime", "departureTime",
  ]) {
    put(id, plain(data[id]));
  }
  for (const id of ["visitDate", "installedOn", "signedAt"]) put(id, usDate(data[id], hand));
  for (const id of ["hoursOnSite", "laborHours"]) put(id, plain(data[id]));
  for (const id of ["partsTotal", "laborRate", "laborTotal", "total"]) put(id, money(data[id], hand));
  put("technicianName", TECHNICIAN_NAMES[data.technicianName] ?? "");
  put("sheetNumber", "1");
  put("sheetCount", "1");
  (data.parts ?? []).forEach((row, index) => {
    put(`parts.${index}.partNumber`, plain(row.partNumber));
    put(`parts.${index}.description`, plain(row.description));
    put(`parts.${index}.quantity`, plain(row.quantity));
    put(`parts.${index}.unitPrice`, money(row.unitPrice, hand));
    put(`parts.${index}.linePrice`, money(row.linePrice, hand));
  });

  const marks = [];
  for (const id of ["status", "equipmentType", "outcome"]) {
    if (typeof data[id] === "string") marks.push(`${id}.${data[id]}`);
  }
  if (typeof data.warranty === "boolean") marks.push(`warranty.${data.warranty ? "yes" : "no"}`);
  return { texts, marks };
}

function signatureSvg(strokes, { className = "", color = INK, width = 2.2 } = {}) {
  const paths = strokes
    .map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 300 100" preserveAspectRatio="xMinYMid meet">${paths}</svg>`;
}

/* ── Chromium ─────────────────────────────────────────────────────────────── */

async function openSheet(browser, deviceScaleFactor = 1) {
  const context = await browser.newContext({
    viewport: { width: SHEET.widthPx, height: SHEET.heightPx },
    deviceScaleFactor,
  });
  const page = await context.newPage();
  await page.goto(SHEET_URL);
  await page.waitForSelector("body[data-ready]");
  return { context, page };
}

/** Everything that must hold before a sheet is used: nothing spills out of it. */
async function assertFits(page, label) {
  const problems = await page.evaluate(() => {
    const found = [];
    for (const sheet of document.querySelectorAll(".sheet")) {
      if (sheet.scrollHeight > sheet.clientHeight + 0.5) {
        found.push(`sheet ${sheet.dataset.page} is ${sheet.scrollHeight - sheet.clientHeight}px too tall`);
      }
    }
    // Where the lines of text sit, not `scrollHeight`, which also counts a
    // handwriting face's tall ascenders and long descenders: the middle of the
    // last line must be half a line above the bottom of the box.
    for (const ink of document.querySelectorAll(".ink")) {
      const box = ink.parentElement.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(ink).lineHeight);
      const range = document.createRange();
      range.selectNodeContents(ink);
      const lines = Array.from(range.getClientRects()).filter((line) => line.width > 0);
      const middle = Math.max(...lines.map((line) => (line.top + line.bottom) / 2));
      const right = Math.max(...lines.map((line) => line.right));
      if (middle > box.bottom - lineHeight / 2 + 2 || right > box.right + 2) {
        found.push(`"${ink.textContent}" overflows ${ink.parentElement.dataset.box} (${lines.length} line boxes)`);
      }
    }
    return found;
  });
  if (problems.length) throw new Error(`${label}:\n  ${problems.join("\n  ")}`);
}

async function pinPdf(bytes, title) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  doc.setTitle(title);
  doc.setAuthor("Tallis Mechanical Services (an invented company)");
  doc.setCreator("scripts/render-work-order-assets.mjs");
  doc.setProducer("Chromium and pdf-lib");
  doc.setCreationDate(PINNED_DATE);
  doc.setModificationDate(PINNED_DATE);
  delete doc.context.trailerInfo.ID;
  return doc.save({ useObjectStreams: false });
}

async function printPdf(page, title) {
  const bytes = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: false, outline: false });
  return pinPdf(bytes, title);
}

/** An image scaled to `width`, as a JPEG. */
async function thumbnail(browser, image, sourceWidth, sourceHeight, width) {
  const height = Math.round((sourceHeight * width) / sourceWidth);
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.setContent(
    `<body style="margin:0"><img style="display:block;width:${width}px;height:${height}px" src="data:image/png;base64,${image.toString("base64")}"></body>`,
  );
  await page.waitForFunction(() => document.images[0].complete);
  const jpeg = await page.screenshot({ type: "jpeg", quality: 82 });
  await context.close();
  return { jpeg, width, height };
}

/** A scene: the filled sheet as an image, placed and degraded by `html`. */
async function scene(browser, { width, height, html, quality }) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.setContent(html);
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  const jpeg = await page.screenshot({ type: "jpeg", quality });
  const png = await page.screenshot({ type: "png" });
  await context.close();
  return { jpeg, png };
}

const NOISE = (seed, opacity, frequency = 0.85) =>
  `<svg style="position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:${opacity}" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;

function photoHtml(sheetPng) {
  // A phone held over a desk: the sheet tilted away, a shadow across its lower
  // half where the phone blocks the light, the desk's edge along the bottom.
  return `<body style="margin:0;width:1200px;height:1600px;overflow:hidden;position:relative;background:#7a5638">
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(94deg,rgba(40,22,10,.18) 0 3px,transparent 3px 19px),repeating-linear-gradient(91deg,rgba(255,220,170,.07) 0 9px,transparent 9px 41px),linear-gradient(180deg,#8a6444,#6e4c30)"></div>
    ${NOISE(3, 0.35, 0.6)}
    <div style="position:absolute;left:0;right:0;top:1470px;bottom:0;background:linear-gradient(180deg,#3b2a1e 0,#2a1f18 6px,#4d4640 7px,#3c3833 100%)"></div>
    <img src="data:image/png;base64,${sheetPng.toString("base64")}" style="position:absolute;left:96px;top:78px;width:1010px;transform:perspective(2400px) rotateX(10deg) rotateY(-4deg) rotateZ(-2.4deg);transform-origin:50% 55%;box-shadow:0 26px 40px rgba(0,0,0,.45);filter:blur(0.9px) brightness(1.01) contrast(0.97)">
    <div style="position:absolute;inset:0;background:linear-gradient(166deg,transparent 52%,rgba(24,16,8,.34) 58%,rgba(24,16,8,.30) 74%,transparent 83%)"></div>
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 40% 32%,rgba(255,236,200,.10),transparent 70%),radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.42))"></div>
  </body>`;
}

function scanHtml(sheetPng, { angle, seed, tint, fold }) {
  // A desk scanner: skewed on the glass, a warm tint, grain, a fold line.
  return `<body style="margin:0;width:1275px;height:1650px;overflow:hidden;position:relative;background:#efebe2">
    <img src="data:image/png;base64,${sheetPng.toString("base64")}" style="position:absolute;left:22px;top:30px;width:1232px;transform:rotate(${angle}deg);transform-origin:30% 20%;filter:sepia(.3) saturate(.85) contrast(1.14) brightness(.95) blur(.5px)">
    <div style="position:absolute;left:-40px;right:-40px;top:${fold}px;height:14px;transform:rotate(${angle}deg);background:linear-gradient(180deg,transparent,rgba(0,0,0,.10) 45%,rgba(255,255,255,.38) 58%,transparent)"></div>
    <div style="position:absolute;inset:0;background:${tint};mix-blend-mode:multiply"></div>
    ${NOISE(seed, 0.28)}
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.22),transparent 36px),linear-gradient(0deg,rgba(0,0,0,.12),transparent 24px)"></div>
  </body>`;
}

/* ── the run ──────────────────────────────────────────────────────────────── */

const round = (value) => Math.round(value * 100) / 100;

async function measureBoxes(page) {
  const { boxes, rows } = await page.evaluate(() => {
    const boxes = {};
    for (const sheet of document.querySelectorAll(".sheet")) {
      const origin = sheet.getBoundingClientRect();
      for (const element of sheet.querySelectorAll("[data-box]")) {
        const rect = element.getBoundingClientRect();
        boxes[element.dataset.box] = {
          page: Number(sheet.dataset.page),
          left: rect.left - origin.left,
          top: rect.top - origin.top,
          width: rect.width,
          height: rect.height,
        };
      }
    }
    const rows = {};
    for (const table of document.querySelectorAll("[data-parts]")) rows[table.dataset.parts] = Number(table.dataset.count);
    return { boxes, rows };
  });
  const table = Object.fromEntries(
    Object.entries(boxes).map(([id, box]) => [
      id,
      {
        page: box.page,
        x: round(box.left * PT_PER_PX),
        y: round(SHEET.heightPt - (box.top + box.height) * PT_PER_PX),
        width: round(box.width * PT_PER_PX),
        height: round(box.height * PT_PER_PX),
      },
    ]),
  );
  return { table, rows: { first: rows.parts, continuation: rows["continued.parts"] } };
}

function boxesModule({ table, rows }) {
  const lines = Object.entries(table).map(
    ([id, box]) => `  ${JSON.stringify(id)}: { page: ${box.page}, x: ${box.x}, y: ${box.y}, width: ${box.width}, height: ${box.height} },`,
  );
  return `// GENERATED by scripts/render-work-order-assets.mjs from assets/work-order/job-sheet.html.
// Do not edit: change the sheet and run \`npm run assets:work-order\`.

/**
 * One box on the job sheet, in PDF points from the bottom-left corner of its
 * page, as pdf-lib draws. \`page\` is the blank's page: 1 is the job sheet, 2 the
 * continuation sheet the printer repeats for as many parts rows as a record has.
 */
export interface SheetBox {
  readonly page: 1 | 2;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Letter, in points. */
export const JOB_SHEET_SIZE = { width: ${SHEET.widthPt}, height: ${SHEET.heightPt} } as const;

/** Ruled rows in the parts table: on the job sheet, and on each continuation sheet. */
export const PARTS_ROWS = { first: ${rows.first}, continuation: ${rows.continuation} } as const;

/**
 * Every box, by id. Ids are question names; a choice is \`<question>.<value>\`, a
 * parts cell \`parts.<row>.<column>\`, and a box on the continuation sheet starts
 * with \`continued.\`.
 */
export const JOB_SHEET_BOXES: Readonly<Record<string, SheetBox>> = {
${lines.join("\n")}
};
`;
}

async function main() {
  const signatures = JSON.parse(await readFile(path.join(ASSETS, "signatures.json"), "utf8"));
  delete signatures.$comment;
  await mkdir(PREVIEWS_OUT, { recursive: true });
  const written = [];
  const write = async (file, bytes, note = "") => {
    await writeFile(file, bytes);
    written.push(`${path.relative(ROOT, file).replaceAll("\\", "/")}  ${(bytes.length / 1024).toFixed(0)} KB${note ? `  ${note}` : ""}`);
  };

  const browser = await chromium.launch();
  try {
    // 1. The blank, and the boxes measured from it.
    {
      const { context, page } = await openSheet(browser);
      await assertFits(page, "blank");
      const measured = await measureBoxes(page);
      await write(path.join(ROOT, "src", "lib", "work-order-boxes.ts"), Buffer.from(boxesModule(measured)),
        `${Object.keys(measured.table).length} boxes, parts rows ${measured.rows.first} + ${measured.rows.continuation}`);
      await write(path.join(SAMPLES_OUT, "work-order-blank.pdf"), await printPdf(page, "Job sheet (blank)"));
      await context.close();
    }

    // 2. Signatures as PNGs, for the records entered on a tablet.
    {
      const context = await browser.newContext({ viewport: { width: 300, height: 100 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const entries = [];
      for (const [name, strokes] of Object.entries(signatures)) {
        await page.setContent(
          `<body style="margin:0;background:transparent">${signatureSvg(strokes, { color: "#1f2a44", width: 2.4 }).replace("<svg ", '<svg width="300" height="100" ')}</body>`,
        );
        const png = await page.locator("svg").screenshot({ type: "png", omitBackground: true });
        entries.push(`  ${name}: "data:image/png;base64,${png.toString("base64")}",`);
      }
      await context.close();
      const module = `// GENERATED by scripts/render-work-order-assets.mjs from assets/work-order/signatures.json.
// Do not edit: change the strokes and run \`npm run assets:work-order\`.

/** Invented customer signatures, 300 x 100 PNG data URLs, as a signature pad stores them. */
export const WORK_ORDER_SIGNATURES = {
${entries.join("\n")}
} as const;
`;
      await write(path.join(ROOT, "src", "schemas", "data", "work-order-signatures.ts"), Buffer.from(module));
    }

    // 3. The documents: each sheet filled in, then printed, photographed or scanned.
    const sheetImage = async (file, deviceScaleFactor) => {
      const sample = JSON.parse(await readFile(path.join(ASSETS, "samples", file), "utf8"));
      const { context, page } = await openSheet(browser, deviceScaleFactor);
      const values = sheetValues(sample.data, Boolean(sample.hand));
      await page.evaluate(
        (options) => {
          document.querySelector('.sheet[data-page="2"]').remove();
          window.fillSheet(options);
        },
        {
          ...values,
          hand: Boolean(sample.hand),
          seed: Number(sample.data.jobNumber.slice(-4)),
          signature: signatureSvg(signatures[sample.signature], { className: "sig-ink" }),
        },
      );
      await assertFits(page, file);
      return { context, page, sample };
    };

    {
      const { context, page } = await sheetImage("WO-2026-0130.json", 2);
      await write(path.join(SAMPLES_OUT, "work-order-0130.pdf"), await printPdf(page, "Job sheet WO-2026-0130"));
      const full = await page.locator(".sheet").screenshot({ type: "png" });
      const fullJpeg = await page.locator(".sheet").screenshot({ type: "jpeg", quality: 85 });
      await write(path.join(PREVIEWS_OUT, "work-order-0130-full.jpg"), fullJpeg, `${SHEET.widthPx * 2}x${SHEET.heightPx * 2}`);
      const thumb = await thumbnail(browser, full, SHEET.widthPx * 2, SHEET.heightPx * 2, 800);
      await write(path.join(PREVIEWS_OUT, "work-order-0130.jpg"), thumb.jpeg, `${thumb.width}x${thumb.height}`);
      await context.close();
    }

    {
      const { context, page } = await sheetImage("WO-2026-0131.json", 1.5);
      const sheet = await page.locator(".sheet").screenshot({ type: "png" });
      await context.close();
      const photo = await scene(browser, { width: 1200, height: 1600, html: photoHtml(sheet), quality: 80 });
      await write(path.join(SAMPLES_OUT, "work-order-0131-photo.jpg"), photo.jpeg, "1200x1600");
      const thumb = await thumbnail(browser, photo.png, 1200, 1600, 600);
      await write(path.join(PREVIEWS_OUT, "work-order-0131-photo.jpg"), thumb.jpeg, `${thumb.width}x${thumb.height}`);
    }

    for (const [file, out, look, preview] of [
      ["WO-2026-0132.json", "work-order-0132-scan.jpg", { angle: 2.4, seed: 7, tint: "rgba(240,222,190,.30)", fold: 560 }, true],
      ["WO-2026-0120.json", "work-order-0120-scan.jpg", { angle: -1.9, seed: 11, tint: "rgba(214,214,206,.30)", fold: 820 }, false],
    ]) {
      const { context, page } = await sheetImage(file, 1275 / SHEET.widthPx);
      const sheet = await page.locator(".sheet").screenshot({ type: "png" });
      await context.close();
      const scan = await scene(browser, { width: 1275, height: 1650, html: scanHtml(sheet, look), quality: 60 });
      await write(path.join(SAMPLES_OUT, out), scan.jpeg, "1275x1650");
      if (preview) {
        const thumb = await thumbnail(browser, scan.png, 1275, 1650, 600);
        await write(path.join(PREVIEWS_OUT, out), thumb.jpeg, `${thumb.width}x${thumb.height}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(written.join("\n"));
}

await main();
