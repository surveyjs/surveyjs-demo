"use client";

import type { RecordRow, StoredRecord } from "@/schemas";
import { exportClaimToCms1500 } from "@/lib/cms1500-pdf";
import { RecordsView } from "@/components/records/RecordsView";
import { ExtractFromDocument } from "@/components/claims/ExtractFromDocument";

/**
 * `/claims`: the shared records page, plus the two things only a claim has — a
 * way in from paper, and a way back onto it.
 */
export function ClaimsView({
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
      collectionId="claims"
      title={title}
      description={description}
      initialRows={initialRows}
      initialRecord={initialRecord}
      // The claim, printed back onto the paper form it came from - not a
      // picture of the questionnaire.
      exportPdf={(data) => exportClaimToCms1500(data)}
      listFooter={({ createFrom }) => (
        <ExtractFromDocument formId="insurance-claim" onExtracted={createFrom} />
      )}
      formNote={
        <>
          <span className="font-medium">Save as PDF</span> prints this claim onto the
          CMS-1500 (02/12) sheet itself, box for box - the same form the answers are
          read from, not a picture of this questionnaire.
        </>
      }
    />
  );
}
