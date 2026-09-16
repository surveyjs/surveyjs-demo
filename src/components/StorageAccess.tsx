"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CookieIcon } from "lucide-react";
import { checkStorageAccess, READ_ONLY_MESSAGE } from "@/storage/access";

interface StorageAccessState {
  /** The browser does not keep the storage cookie: every write control is disabled. */
  readOnly: boolean;
  /** What the banner says, for components that show it in their own error slot. */
  message: string;
}

const StorageAccessContext = createContext<StorageAccessState>({
  readOnly: false,
  message: READ_ONLY_MESSAGE,
});

/**
 * Whether this browser can keep what the demo stores, for every write control.
 *
 * The handshake (`src/storage/access.ts`) runs once, after mount. Until it
 * answers, `readOnly` is `false`, so the server markup is the same for every
 * visitor and nothing flickers for the ones whose cookies work. Mounted in the
 * root layout, beside `HowBuiltProvider`, so the embedded demos and the editor
 * share the same answer.
 */
export function StorageAccessProvider({ children }: { children: ReactNode }) {
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    let active = true;
    void checkStorageAccess().then((access) => {
      if (active) setReadOnly(access === "read-only");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <StorageAccessContext.Provider value={{ readOnly, message: READ_ONLY_MESSAGE }}>
      {children}
    </StorageAccessContext.Provider>
  );
}

export function useStorageAccess(): StorageAccessState {
  return useContext(StorageAccessContext);
}

/** One line under the top bar, only in a browser that blocks the cookie. */
export function StorageReadOnlyBanner() {
  const { readOnly, message } = useStorageAccess();
  if (!readOnly) return null;
  return (
    <p
      role="status"
      className="flex shrink-0 items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <CookieIcon className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
