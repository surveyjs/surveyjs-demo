"use client";

import { ChevronDownIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The page header's record picker: which record the form is open on, and a way
 * to open another without scrolling the list.
 *
 * `modal={false}`, as the demo dock's pickers: a modal menu locks page scroll,
 * and taking the scrollbar away shifts the layout sideways.
 */
export function RecordSwitcher({
  label,
  current,
  activeId,
  options,
  onSelect,
}: {
  /** The record noun, capitalised: "Claim". */
  label: string;
  /** What the trigger names the open record. */
  current: string;
  /** The open record's id, or undefined while a new one is not yet stored. */
  activeId: string | undefined;
  options: readonly { id: string; title: string }[];
  onSelect: (id: string) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-64 gap-2">
          <FileTextIcon />
          <span className="truncate">
            {label}: {current}
          </span>
          <ChevronDownIcon className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
        <DropdownMenuLabel>Open a {label.toLowerCase()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={activeId ?? ""} onValueChange={onSelect}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              <span className="truncate">{option.title}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
