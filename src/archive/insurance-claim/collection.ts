import type { RecordCollection } from "../../schemas/records";
import type { SurveyData } from "../../schemas/types";
import { insuranceClaimSeed } from "./insurance-claim-seed";

/** The patient's name as the list shows it. `null` when the claim has none yet. */
function patientName(data: SurveyData): string | null {
  return [data.patientFirstName, data.patientLastName].filter(Boolean).join(" ") || null;
}

/** The next free number in the `CLM-<year>-<n>` format the seed records use. */
function nextClaimId(existing: readonly string[]): string {
  const prefix = `CLM-${new Date().getFullYear()}-`;
  const highest = existing.reduce((max, id) => {
    if (!id.startsWith(prefix)) return max;
    const number = Number(id.slice(prefix.length));
    return Number.isFinite(number) && number > max ? number : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

/**
 * The CMS-1500 claims behind `/claims`. No `compare`: claims keep the order
 * they were stored in.
 */
export const claimsCollection: RecordCollection = {
  id: "claims",
  schemaId: "insurance-claim",
  noun: { one: "claim", many: "claims" },
  columns: [
    { key: "claimNumber", label: "Claim #", kind: "id" },
    { key: "patientName", label: "Patient", kind: "text" },
    {
      key: "status",
      label: "Status",
      kind: "badge",
      tones: {
        draft: "neutral",
        submitted: "info",
        in_review: "warning",
        approved: "success",
        denied: "danger",
      },
    },
    { key: "totalCharge", label: "Total charge", kind: "money" },
  ],
  rail: { primary: "patientName", secondary: ["claimNumber", "status"] },
  titleKey: "claimNumber",
  toColumns: (id, data) => ({
    claimNumber: id,
    patientName: patientName(data),
    status: typeof data.status === "string" ? data.status : null,
    totalCharge: typeof data.totalCharge === "number" ? data.totalCharge : null,
  }),
  newId: nextClaimId,
  newRecord: (id) => ({ claimNumber: id, status: "draft" }),
  seed: insuranceClaimSeed,
};
