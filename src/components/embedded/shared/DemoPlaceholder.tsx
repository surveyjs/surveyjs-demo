"use client";

import { useId, type ReactElement } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DemoPlaceholder({
  children,
  message = "Product demo. This feature is for illustration only.",
}: {
  children: ReactElement;
  message?: string;
}) {
  const messageId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        aria-labelledby={messageId}
        collisionPadding={12}
        sideOffset={6}
        className="w-max max-w-[min(16rem,var(--radix-popover-content-available-width))] px-3 py-2 text-xs leading-relaxed"
      >
        <p id={messageId}>{message}</p>
      </PopoverContent>
    </Popover>
  );
}
