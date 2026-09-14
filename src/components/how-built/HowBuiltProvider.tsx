"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface HowBuilt {
  /** Whether the "How this page is built" panel is open. */
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

const HowBuiltContext = createContext<HowBuilt | null>(null);

/**
 * Whether the "How this page is built" panel is open, for whatever toggles or
 * draws it.
 *
 * Mounted in the root layout rather than in `AdminShell`, so the embedded demos,
 * which wear no shell, can reach the same state once their dock gets the toggle.
 */
export function HowBuiltProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const value = useMemo(() => ({ open, toggle, setOpen }), [open, toggle]);

  return <HowBuiltContext.Provider value={value}>{children}</HowBuiltContext.Provider>;
}

export function useHowBuilt(): HowBuilt {
  const value = useContext(HowBuiltContext);
  if (!value) throw new Error("useHowBuilt must be used inside HowBuiltProvider.");
  return value;
}
