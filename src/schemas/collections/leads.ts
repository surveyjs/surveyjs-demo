import type { RecordCollection } from "../records";
import type { SurveyData } from "../types";
import { LEAD_OWNERS } from "../leads";
import { leadsSeed } from "../data/leads-seed";

/** survey-core's `round(x, 2)`, so the list and the form agree to the cent. */
function round2(value: number): number {
  return Math.round(value * 100 * (1 + Number.EPSILON)) / 100;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * The deal value, recomputed from the line items with the definition's own
 * rules: `lineGross = round(qty × price)`, `lineTotal = round(gross × (1 −
 * discount%))`, summed and rounded. Never copied from a stored total.
 */
export function dealValueOf(data: SurveyData): number {
  const items = Array.isArray(data.lineItems) ? data.lineItems : [];
  const total = items.reduce<number>((sum, item) => {
    if (typeof item !== "object" || item === null) return sum;
    const row = item as Record<string, unknown>;
    const gross = round2(num(row.quantity) * num(row.unitPrice));
    return sum + round2(gross * (1 - num(row.discountPct) / 100));
  }, 0);
  return round2(total);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * The opportunities behind `/leads`. Listed by expected close date, soonest
 * first; a lead without one goes last, and ties go by account name.
 */
export const leadsCollection: RecordCollection = {
  id: "leads",
  schemaId: "leads",
  noun: { one: "lead", many: "leads" },
  columns: [
    { key: "accountName", label: "Account", kind: "text" },
    { key: "ownerName", label: "Owner", kind: "text" },
    {
      key: "stage",
      label: "Stage",
      kind: "badge",
      tones: {
        new: "neutral",
        qualified: "info",
        proposal: "info",
        negotiation: "warning",
        closedWon: "success",
        closedLost: "danger",
      },
      labels: {
        new: "New",
        qualified: "Qualified",
        proposal: "Proposal",
        negotiation: "Negotiation",
        closedWon: "Closed won",
        closedLost: "Closed lost",
      },
    },
    { key: "dealValue", label: "Deal value", kind: "money", currencyKey: "currency" },
    { key: "nextStepDate", label: "Next step", kind: "date" },
  ],
  rail: { primary: "accountName", secondary: ["stage", "dealValue"] },
  titleKey: "accountName",
  // Five displayed, plus `currency` (read by the money column) and
  // `expectedClose` (read by `compare`), stored and not shown.
  toColumns: (_id, data) => ({
    accountName: text(data.accountName),
    ownerName: LEAD_OWNERS.find((owner) => owner.id === data.owner)?.name ?? null,
    stage: text(data.stage),
    dealValue: dealValueOf(data),
    nextStepDate: text(data.nextStepDate),
    currency: text(data.currency),
    expectedClose: text(data.expectedClose),
  }),
  newId: (existing) => {
    const highest = existing.reduce((max, id) => {
      const match = /^LEAD-(\d+)$/.exec(id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `LEAD-${String(highest + 1).padStart(4, "0")}`;
  },
  // Owner and currency come from whoever creates the lead. Set here rather than
  // by `defaultValueExpression`, so opening an existing lead as somebody else
  // never rewrites them.
  newRecord: (_id, user) => ({
    owner: user?.id,
    currency: typeof user?.currency === "string" ? user.currency : "USD",
    stage: "new",
  }),
  compare: (a, b) => {
    const left = a.expectedClose;
    const right = b.expectedClose;
    if (left !== right) {
      if (!left) return 1;
      if (!right) return -1;
      return String(left) < String(right) ? -1 : 1;
    }
    return String(a.accountName ?? "").localeCompare(String(b.accountName ?? ""));
  },
  seed: leadsSeed,
  rowIdContainers: ["contacts", "lineItems", "competitors", "securityReview", "activities"],
};
