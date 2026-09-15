/**
 * Documents that ship with the template, for trying extraction in one click.
 * Each fills one survey, named by `schemaId`, box for box.
 *
 * The work order samples are drawn by `scripts/render-work-order-assets.mjs`
 * from `assets/work-order/`: the same job sheet, filled in, then printed,
 * photographed and scanned. The sizes below are the ones it prints.
 */
export interface SampleDocument {
  readonly id: string;
  /** Shown on the tile. */
  readonly label: string;
  /** What kind of file this is, in the reader's terms. */
  readonly kind: string;
  /** Wording on the tile's button, so it names the kind of document. */
  readonly action: string;
  /** What is on the page, so it is clear what should appear in the form. */
  readonly summary: string;
  /** The document itself, served from `public/`. */
  readonly file: string;
  readonly preview: string;
  readonly previewWidth: number;
  readonly previewHeight: number;
  /**
   * The same page at full resolution, for the popup. Served as it is - the
   * boxes have to be readable, which is the whole reason to open it.
   */
  readonly full: string;
  readonly fullWidth: number;
  readonly fullHeight: number;
  readonly schemaId: string;
}

/** In card order: the handwritten photo is second, not last. */
export const workOrderSampleDocuments: readonly SampleDocument[] = [
  {
    id: "work-order-0130",
    label: "Boiler lockout, WO-2026-0130",
    kind: "Digital PDF",
    action: "Add from PDF",
    summary: "Straight out of the office system: clean text, three parts lines.",
    file: "/samples/work-order-0130.pdf",
    preview: "/samples/previews/work-order-0130.jpg",
    previewWidth: 800,
    previewHeight: 1035,
    full: "/samples/previews/work-order-0130-full.jpg",
    fullWidth: 1632,
    fullHeight: 2112,
    schemaId: "work-order",
  },
  {
    id: "work-order-0131",
    label: "Kitchen extract fan, WO-2026-0131",
    kind: "Phone photo",
    action: "Add from photo",
    summary:
      "A technician's sheet photographed on site: handwriting, a shadow across the parts table, and a couple of digits worth checking against the sheet.",
    file: "/samples/work-order-0131-photo.jpg",
    preview: "/samples/previews/work-order-0131-photo.jpg",
    previewWidth: 600,
    previewHeight: 800,
    full: "/samples/work-order-0131-photo.jpg",
    fullWidth: 1200,
    fullHeight: 1600,
    schemaId: "work-order",
  },
  {
    id: "work-order-0132",
    label: "Walk-in cooler, WO-2026-0132",
    kind: "Scanned JPEG",
    action: "Add from scan",
    summary:
      "The same kind of sheet off a desk scanner: skewed, tinted, no text layer, so this one goes through the model's OCR.",
    file: "/samples/work-order-0132-scan.jpg",
    preview: "/samples/previews/work-order-0132-scan.jpg",
    previewWidth: 600,
    previewHeight: 776,
    full: "/samples/work-order-0132-scan.jpg",
    fullWidth: 1275,
    fullHeight: 1650,
    schemaId: "work-order",
  },
] as const;
