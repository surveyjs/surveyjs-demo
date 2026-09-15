import type { SampleDocument } from "@/components/extract/sample-documents";

/**
 * The claim documents that shipped with `/claims`. Both are the same standard
 * form, CMS-1500 (02/12), once as a digital PDF and once as a scan. To show
 * them again, pass these to `ExtractFromDocument` as its `samples`.
 */
export const claimSampleDocuments: readonly SampleDocument[] = [
  {
    id: "office-visit",
    label: "Office visit and EKG",
    kind: "Digital PDF",
    action: "Add from PDF",
    summary:
      "A PDF straight out of billing software: Margaret Chen, three service lines, $248.00 total.",
    file: "/samples/archive/cms-1500/cms-1500-filled.pdf",
    preview: "/samples/archive/cms-1500/previews/cms-1500-filled.jpg",
    previewWidth: 1100,
    previewHeight: 1467,
    full: "/samples/archive/cms-1500/previews/cms-1500-filled-full.jpg",
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
    file: "/samples/archive/cms-1500/cms-1500-therapy-scan.jpg",
    preview: "/samples/archive/cms-1500/previews/cms-1500-therapy-scan.jpg",
    previewWidth: 1100,
    previewHeight: 1453,
    full: "/samples/archive/cms-1500/cms-1500-therapy-scan.jpg",
    fullWidth: 1550,
    fullHeight: 2047,
    schemaId: "insurance-claim",
  },
] as const;
