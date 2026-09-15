import type { RecordColumn, RecordColumns } from "@/schemas";
import { mergeTailwindClasses } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Badge tones as classes. The collection names a tone; only this file knows CSS. */
export const TONE_CLASSES: Record<NonNullable<RecordColumn["tones"]>[string], string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300 dark:bg-sky-400/15",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-400/15",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-400/15",
  danger: "bg-destructive/15 text-destructive dark:text-red-300 dark:bg-red-400/15",
};

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function Cell({ column, columns }: { column: RecordColumn; columns: RecordColumns }) {
  const value = columns[column.key];
  if (isEmpty(value)) return <>—</>;

  switch (column.kind) {
    case "badge": {
      const label = column.labels?.[String(value)];
      return (
        <Badge
          variant="secondary"
          className={mergeTailwindClasses(
            !label && "capitalize",
            TONE_CLASSES[column.tones?.[String(value)] ?? "neutral"],
          )}
        >
          {label ?? String(value).replace(/_/g, " ")}
        </Badge>
      );
    }
    case "money": {
      if (typeof value !== "number") return <>{String(value)}</>;
      const code = column.currencyKey ? columns[column.currencyKey] : undefined;
      const currency = typeof code === "string" && code ? code : "USD";
      return <>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)}</>;
    }
    case "date":
      // UTC, so an ISO date is the same day on the server and in every browser.
      return (
        <>
          {new Date(String(value)).toLocaleDateString("en-US", {
            dateStyle: "medium",
            timeZone: "UTC",
          })}
        </>
      );
    default:
      return <>{String(value)}</>;
  }
}

export const RIGHT_ALIGNED: ReadonlySet<RecordColumn["kind"]> = new Set(["money"]);
