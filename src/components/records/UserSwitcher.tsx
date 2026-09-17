"use client";

import { ChevronDownIcon, UserRoundIcon } from "lucide-react";
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
import type { SessionUser } from "@/schemas";

/**
 * "Signed in as": the users `listSessionUsers` returns for the page. In your
 * app there is one, from the session, and nothing to pick — so with fewer than
 * two this renders nothing.
 */
export function UserSwitcher({
  users,
  activeId,
  onSelect,
}: {
  users: readonly SessionUser[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  if (users.length < 2) return null;
  const active = users.find((user) => user.id === activeId) ?? users[0];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-64 gap-2"
          title="The same record, rendered for somebody else"
        >
          <UserRoundIcon />
          <span className="truncate">Signed in as: {active.name}</span>
          <ChevronDownIcon className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Sign in as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={active.id} onValueChange={onSelect}>
          {users.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              {option.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
