"use client";

import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react";
import type { RecordCollection, RecordRow } from "@/schemas";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordSummary } from "./RecordRailItem";

/**
 * The rail below `xl`: a dropdown above the form. Beside a rail, a form narrower
 * than 1280px of screen would fall under the theme's `--sd-mobile-width` (640px)
 * and render every matrix as stacked cards, so the list gives up its column.
 *
 * `RecordsView` renders both this and `RecordRail`, and CSS hides one: both are
 * in the server HTML, so nothing differs at hydration, and `display: none` keeps
 * the hidden one out of the accessibility tree. Picking a row calls the same
 * `onSelect` as the rail.
 */
export function RecordPicker({
  collection,
  rows,
  selectedId,
  onSelect,
  onNew,
  noun,
  disabled = false,
  newDisabled = false,
}: {
  collection: RecordCollection;
  rows: readonly RecordRow[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onNew: () => void;
  noun: RecordCollection["noun"];
  disabled?: boolean;
  /** New alone: a browser whose storage is read-only can still browse. */
  newDisabled?: boolean;
}) {
  const selected = rows.find((row) => row.id === selectedId);

  return (
    <div className="mb-4 flex items-center gap-2 xl:hidden">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label={`Choose a ${noun.one}`}
            disabled={disabled}
            className="h-auto min-w-0 flex-1 justify-between px-3 py-2 text-left font-normal whitespace-normal"
          >
            <span className="min-w-0 flex-1">
              {selected ? (
                <RecordSummary collection={collection} row={selected} />
              ) : (
                <span className="text-muted-foreground block truncate">Choose a {noun.one}</span>
              )}
            </span>
            <ChevronDownIcon className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-96 w-(--radix-dropdown-menu-trigger-width)">
          {rows.map((row) => (
            <DropdownMenuItem key={row.id} onSelect={() => onSelect(row.id)} className="items-start">
              <span className="min-w-0 flex-1">
                <RecordSummary collection={collection} row={row} />
              </span>
              <CheckIcon className={row.id === selectedId ? "mt-0.5" : "invisible"} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" variant="outline" aria-label={`New ${noun.one}`} disabled={disabled || newDisabled} onClick={onNew}>
        <PlusIcon />
        New
      </Button>
    </div>
  );
}
