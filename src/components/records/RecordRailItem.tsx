import type { MouseEvent } from "react";
import type { RecordCollection, RecordRow } from "@/schemas";
import { mergeTailwindClasses } from "@/lib/utils";
import { Cell, isEmpty } from "./ColumnValue";

/**
 * What one record looks like in the rail and in the dropdown that replaces it
 * below `xl`: the collection's `rail.primary` column on the first line, its
 * `rail.secondary` columns on the second. Every other column is still stored,
 * and shown in the form.
 */
export function RecordSummary({
  collection,
  row,
}: {
  collection: RecordCollection;
  row: RecordRow;
}) {
  const primary = row.columns[collection.rail.primary];
  return (
    <>
      <span className="block truncate font-medium">{isEmpty(primary) ? row.id : String(primary)}</span>
      <span className="text-muted-foreground mt-1 flex min-w-0 items-center gap-2 text-sm">
        {collection.rail.secondary.map((key) => {
          const column = collection.columns.find((item) => item.key === key);
          if (!column) return null;
          return (
            <span
              key={key}
              className={mergeTailwindClasses(
                "min-w-0 truncate",
                column.kind === "id" && "font-mono text-xs",
                column.kind === "badge" && "shrink-0",
              )}
            >
              <Cell column={column} columns={row.columns} />
            </span>
          );
        })}
      </span>
    </>
  );
}

/** A click the browser should handle itself: a new tab, a new window, a download. */
function isModified(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * One record in the rail. The whole row is a real link to the record's URL, so
 * it opens in a new tab like any link; a plain click stays in the page and goes
 * through `onSelect`, which asks before discarding changes. No buttons inside:
 * Edit and Delete belong to the open record, in the form's header.
 */
export function RecordRailItem({
  collection,
  row,
  href,
  selected,
  disabled = false,
  onSelect,
}: {
  collection: RecordCollection;
  row: RecordRow;
  href: string;
  selected: boolean;
  /** While a document is being read: the link stays a link, and a plain click does nothing. */
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <a
      href={href}
      aria-current={selected ? "page" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      data-selected={selected ? "" : undefined}
      onClick={(event) => {
        if (isModified(event)) return;
        event.preventDefault();
        if (!disabled) onSelect(row.id);
      }}
      // The focus ring is inset because the rail scrolls, and its overflow would
      // clip a ring drawn outside the row. The selection bar is its own element,
      // not an inset shadow: a shadow follows the rounded corners and reads as a
      // frame with three sides cut off.
      className={mergeTailwindClasses(
        "hover:bg-muted/50 focus-visible:ring-ring/50 relative block rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
        selected &&
          "bg-accent text-accent-foreground hover:bg-accent before:bg-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <RecordSummary collection={collection} row={row} />
    </a>
  );
}
