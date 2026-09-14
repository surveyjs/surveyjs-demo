/**
 * The claim documents that ship with the template, for trying extraction in one
 * click. Both are the same standard form - CMS-1500 (02/12) - so the answers
 * land box for box in the survey, which is the whole point of the exercise.
 *
 * `schemaId` says which survey a document fills: today both fill the claim
 * form, and a different kind of paperwork can be added here with its own
 * schema without touching the page.
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

export const sampleDocuments: readonly SampleDocument[] = [
  {
    id: "office-visit",
    label: "Office visit and EKG",
    kind: "Digital PDF",
    action: "Add from PDF",
    summary:
      "A PDF straight out of billing software: Margaret Chen, three service lines, $248.00 total.",
    file: "/samples/cms-1500-filled.pdf",
    preview: "/samples/previews/cms-1500-filled.jpg",
    previewWidth: 1100,
    previewHeight: 1467,
    full: "/samples/previews/cms-1500-filled-full.jpg",
    fullWidth: 1685,
    fullHeight: 2246,
    schemaId: "insurance-claim",
  },
  {
    id: "therapy-scan",
    label: "Back pain and therapy",
    kind: "Scanned JPEG",
    action: "Add from scan",
    summary:
      "The same form off a scanner - skewed, tinted, grainy: Rosa Delgado, three service lines, $415.00 total. A scan has no text layer, so this one goes through the model's OCR: expect the odd digit to need a correction.",
    file: "/samples/cms-1500-therapy-scan.jpg",
    preview: "/samples/previews/cms-1500-therapy-scan.jpg",
    previewWidth: 1100,
    previewHeight: 1453,
    full: "/samples/cms-1500-therapy-scan.jpg",
    fullWidth: 1550,
    fullHeight: 2047,
    schemaId: "insurance-claim",
  },
] as const;
