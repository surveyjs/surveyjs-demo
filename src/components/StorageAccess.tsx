"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CookieIcon } from "lucide-react";
import { checkStorageAccess, READ_ONLY_MESSAGE } from "@/storage/access";
import { mergeTailwindClasses } from "@/lib/utils";

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
 * root layout, so every example page and the editor share the same answer.
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

/**
 * One line, only in a browser that blocks the cookie. The dock pins it above
 * itself, so every example page has it and the page's own layout does not move.
 */
export function StorageReadOnlyBanner({ className }: { className?: string }) {
  const { readOnly, message } = useStorageAccess();
  if (!readOnly) return null;
  return (
    <p
      role="status"
      lang="en"
      className={mergeTailwindClasses(
        "flex max-w-full items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm text-amber-900 shadow-md dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
        className,
      )}
    >
      <CookieIcon className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
