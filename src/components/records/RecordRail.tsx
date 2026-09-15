import { PlusIcon } from "lucide-react";
import type { RecordCollection, RecordRow } from "@/schemas";
import { recordHref } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { RecordRailItem } from "./RecordRailItem";

/**
 * The records list, as a 260px navigation rail beside the form, from `xl`.
 * Below `xl`, `RecordPicker` shows the same rows as a dropdown.
 *
 * This is the application's own React, not a SurveyJS component.
 */
export function RecordRail({
  collection,
  title,
  rows,
  selectedId,
  basePath,
  onSelect,
  onNew,
  noun,
  disabled = false,
}: {
  collection: RecordCollection;
  /** The page's nav label, which names the rail's navigation landmark. */
  title: string;
  rows: readonly RecordRow[];
  /** `undefined` while nothing in the list is open: a new record, or the import panel. */
  selectedId: string | undefined;
  basePath: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  noun: RecordCollection["noun"];
  /** While a document is being read, nothing here leaves the panel. */
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="text-base font-semibold">
          {rows.length} {rows.length === 1 ? noun.one : noun.many}
        </h2>
        <Button
          size="sm"
          variant="outline"
          aria-label={`New ${noun.one}`}
          disabled={disabled}
          onClick={onNew}
        >
          <PlusIcon />
          New
        </Button>
      </div>
      {/* Search goes here, between the header and the list, once the list query takes a filter. */}
      <nav aria-label={title}>
        <ul className="space-y-0.5">
          {rows.map((row) => (
            <li key={row.id}>
              <RecordRailItem
                collection={collection}
                row={row}
                href={recordHref(basePath, row.id)}
                selected={row.id === selectedId}
                disabled={disabled}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
