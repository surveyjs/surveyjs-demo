"use client";

import { useState, type ReactNode } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HowBuiltPanel } from "@/components/how-built/HowBuiltPanel";
import { StorageReadOnlyBanner } from "@/components/StorageAccess";
import { Sidebar } from "./Sidebar";
import { TopBar, TopBarBrand, TopBarLinks } from "./TopBar";

const SIDEBAR_WIDTH = "17rem";

/**
 * The admin chrome: the top bar, the sidebar and the page between them.
 *
 * It wraps every `layout: "shell"` page in `src/schemas/navigation.ts`. The top
 * bar reads the edition config (`@/features`), so the full edition changes that
 * config, not this file. Below `lg` the sidebar moves into a sheet, which also
 * carries the edition switch and the site links the top bar has no room for.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileNav = (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto p-0">
        <SheetHeader className="border-b">
          <SheetTitle className="text-left">
            <TopBarBrand />
          </SheetTitle>
        </SheetHeader>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
        <div className="border-t px-6 py-4">
          <TopBarLinks />
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <TopBar mobileNav={mobileNav} />
      <StorageReadOnlyBanner />

      {/*
        One scroller, the page's. The sidebar and the content share it: neither
        is a scroll container, so the sidebar never grows a scrollbar of its own
        however many rows an edition adds. The flex default `align-items:
        stretch` runs the sidebar's background and border the whole height of
        whatever the page turns out to be.

        Two things follow for a page rendered in here, and both are load-bearing:
        anything `sticky` sticks to the viewport rather than to this row, so it
        has to clear the top bar itself with `top-14`; and `h-full` no longer
        resolves, because no ancestor has a definite height any more — a page
        that wants to fill the screen asks for `100svh` less this shell's
        `3.5rem` bar and `main`'s padding below.
      */}
      <div className="flex flex-1">
        <aside
          className="bg-sidebar text-sidebar-foreground hidden shrink-0 border-r lg:block"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <Sidebar />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      <HowBuiltPanel />
    </div>
  );
}
