"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon } from "lucide-react";
import { CHANGES_SAVED } from "@/schemas";

const VISIBLE_MS = 3000;

/**
 * The page-level "Changes saved" notice of a `"save"` page: `show()` after the
 * server stored the answers, and render `<SavedToast visible={visible} />`.
 *
 * It belongs to the page, not to the survey: a records page rebuilds its form
 * after every save, and anything drawn inside the old one — survey-core's own
 * notifier included — would go with it.
 */
export function useSavedToast(): { visible: boolean; show: () => void } {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), VISIBLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { visible, show };
}

/**
 * Centred just under the sticky 3.5rem host header, where the Save button that
 * raised it is; the bottom of the screen is the dock's and "See next"'s. The
 * region is always mounted and only its text comes and goes, which is what
 * makes a screen reader announce it.
 */
export function SavedToast({ visible }: { visible: boolean }) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-50 flex justify-center px-4"
    >
      {visible && (
        <p className="bg-foreground text-background animate-in fade-in-0 slide-in-from-top-2 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg motion-reduce:animate-none">
          <CheckIcon className="size-4" aria-hidden="true" />
          {CHANGES_SAVED}
        </p>
      )}
    </div>
  );
}
