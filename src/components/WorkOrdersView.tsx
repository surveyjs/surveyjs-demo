"use client";

import type { RecordRow, StoredRecord } from "@/schemas";
import { features } from "@/features";
import { RecordsView, type DocumentImport } from "@/components/records/RecordsView";
import { ExtractFromDocument } from "@/components/extract/ExtractFromDocument";
import { workOrderSampleDocuments } from "@/components/extract/sample-documents";

/**
 * Adding a work order from paper. The header's "Add from document" opens the
 * panel in the form column's place, at `/work-orders/from-document`; a finished
 * reading opens the new draft at its own URL.
 */
const fromDocument: DocumentImport = {
  label: "Add from document",
  segment: "from-document",
  render: ({ createFrom, onBusyChange }) => (
    <ExtractFromDocument
      formId="work-order"
      noun="work order"
      documentName="job sheet"
      samples={workOrderSampleDocuments}
      onExtracted={createFrom}
      onBusyChange={onBusyChange}
    />
  ),
};

/**
 * `/work-orders`: the shared records page, plus the way in from paper, and in
 * editions that print one, the way back onto it.
 */
export function WorkOrdersView({
  title,
  description,
  basePath,
  initialRows,
  initialRecord,
  initialImport,
}: {
  title: string;
  description: string;
  basePath: string;
  /** Read on the server by the page, so the first paint is complete. */
  initialRows: readonly RecordRow[];
  initialRecord: StoredRecord | undefined;
  /** Set by `from-document/page.tsx`: the page opens on the import panel. */
  initialImport?: boolean;
}) {
  // The full edition plugs in the job sheet printer: the record, printed onto the
  // company's own sheet - not a picture of the questionnaire. Undefined here, so
  // neither the button nor the note below renders.
  const exportPdf = features.exportWorkOrderPdf;

  return (
    <RecordsView
      collectionId="workOrders"
      title={title}
      description={description}
      basePath={basePath}
      initialRows={initialRows}
      initialRecord={initialRecord}
      initialImport={initialImport}
      exportPdf={exportPdf}
      documentImport={fromDocument}
      formNote={
        exportPdf && (
          <>
            <span className="font-medium">Save as PDF</span> prints this work order onto
            the company&apos;s own job sheet, box by box - the same sheet a technician fills
            in on site, not a picture of this questionnaire.
          </>
        )
      }
    />
  );
}
