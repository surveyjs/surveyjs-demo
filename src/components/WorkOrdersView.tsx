"use client";

import type { RecordRow, StoredRecord } from "@/schemas";
import { exportWorkOrderToPdf } from "@/lib/work-order-pdf";
import { RecordsView } from "@/components/records/RecordsView";
import { ExtractFromDocument } from "@/components/extract/ExtractFromDocument";
import { workOrderSampleDocuments } from "@/components/extract/sample-documents";

/**
 * `/work-orders`: the shared records page, plus the two things only a job sheet
 * has - a way in from paper, and a way back onto it.
 */
export function WorkOrdersView({
  title,
  description,
  initialRows,
  initialRecord,
}: {
  title: string;
  description: string;
  /** Read on the server by the page, so the first paint is complete. */
  initialRows: readonly RecordRow[];
  initialRecord: StoredRecord | undefined;
}) {
  return (
    <RecordsView
      collectionId="workOrders"
      title={title}
      description={description}
      initialRows={initialRows}
      initialRecord={initialRecord}
      // The parts table is five columns wide; see `layout` on RecordsView.
      layout="stacked"
      // The record, printed onto the company's own job sheet - not a picture of
      // the questionnaire.
      exportPdf={(data) => exportWorkOrderToPdf(data)}
      listFooter={({ createFrom }) => (
        <ExtractFromDocument
          formId="work-order"
          noun="work order"
          documentName="job sheet"
          samples={workOrderSampleDocuments}
          onExtracted={createFrom}
        />
      )}
      formNote={
        <>
          <span className="font-medium">Save as PDF</span> prints this work order onto
          the company&apos;s own job sheet, box by box - the same sheet a technician fills
          in on site, not a picture of this questionnaire.
        </>
      }
    />
  );
}
