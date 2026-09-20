import { isReservedRecordId, type RecordCollection } from "../records";
import type { SurveyData } from "../types";
import { EQUIPMENT_TYPES, WORK_ORDER_STATUSES } from "../work-order";
import { workOrderSeed } from "../data/work-order-seed";

/** survey-core's `round(x, 2)`, so the list and the form agree to the cent. */
function round2(value: number): number {
  return Math.round(value * 100 * (1 + Number.EPSILON)) / 100;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * The total, recomputed from the parts and the labor with the definition's own
 * rounding: `linePrice = round(qty × price)`, `partsTotal = round(Σ)`,
 * `laborTotal = round(hours × rate)`, `total = round(parts + labor)`. Never
 * copied from a stored total.
 */
export function workOrderTotalOf(data: SurveyData): number {
  const parts = Array.isArray(data.parts) ? data.parts : [];
  const partsTotal = round2(
    parts.reduce<number>((sum, item) => {
      if (typeof item !== "object" || item === null) return sum;
      const row = item as Record<string, unknown>;
      return sum + round2(num(row.quantity) * num(row.unitPrice));
    }, 0),
  );
  const laborTotal = round2(num(data.laborHours) * num(data.laborRate));
  return round2(partsTotal + laborTotal);
}

/** The id a work order prints in its JOB NO. box. */
const JOB_NUMBER = /^WO-\d{4}-\d{4}$/;

/** The next free number in the `WO-<year>-<n>` format the seed records use. */
function nextWorkOrderId(existing: readonly string[]): string {
  const prefix = `WO-${new Date().getFullYear()}-`;
  const highest = existing.reduce((max, id) => {
    if (!id.startsWith(prefix)) return max;
    const number = Number(id.slice(prefix.length));
    return Number.isFinite(number) && number > max ? number : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

/**
 * The job sheets behind `/work-orders`. No `compare`: work orders keep the
 * order they were stored in, so the page opens on the first seed record.
 */
export const workOrdersCollection: RecordCollection = {
  id: "workOrders",
  schemaId: "work-order",
  noun: { one: "work order", many: "work orders" },
  columns: [
    { key: "jobNumber", label: "Job #", kind: "id" },
    { key: "customerName", label: "Customer", kind: "text" },
    { key: "equipmentType", label: "Equipment", kind: "text" },
    {
      key: "status",
      label: "Status",
      kind: "badge",
      tones: {
        draft: "neutral",
        scheduled: "info",
        inProgress: "warning",
        completed: "success",
        invoiced: "success",
      },
      labels: Object.fromEntries(WORK_ORDER_STATUSES.map((choice) => [choice.value, choice.text])),
    },
    { key: "total", label: "Total", kind: "money" },
  ],
  rail: { primary: "customerName", secondary: ["jobNumber", "status"] },
  titleKey: "jobNumber",
  toColumns: (id, data) => ({
    jobNumber: id,
    customerName: text(data.customerName),
    // The choice's text, as the form shows it.
    equipmentType: EQUIPMENT_TYPES.find((choice) => choice.value === data.equipmentType)?.text ?? null,
    status: text(data.status),
    total: workOrderTotalOf(data),
  }),
  newId: nextWorkOrderId,
  newRecord: (id) => ({ jobNumber: id, status: "draft", laborRate: 85 }),
  // A sheet that has only been read off paper is a draft until a technician has
  // been through it, so the write route checks its shape and not its
  // completeness. Every other status is a record somebody signed off.
  isDraft: (data) => data.status === "draft",
  // A sheet read from paper keeps what is printed on it, its own job number and
  // labor rate included. The app forces only what a document must not decide:
  // the draft status and where the record came from.
  fromDocument: {
    // The job number format already excludes every static route under the page,
    // but the check is explicit: a document must never be able to name a record
    // `how` or `from-document` and shadow the explainer or the import panel.
    id: (data, existing) => {
      const printed = data.jobNumber;
      return typeof printed === "string" &&
        JOB_NUMBER.test(printed) &&
        !isReservedRecordId(printed) &&
        !existing.includes(printed)
        ? printed
        : undefined;
    },
    pinned: (id, source) => ({
      jobNumber: id,
      status: "draft",
      sourceDocument: source
        ? [{ name: source.name, type: source.type, content: source.url }]
        : undefined,
      importedAt: source?.readAt,
    }),
  },
  seed: workOrderSeed,
};
