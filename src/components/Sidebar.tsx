"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BracesIcon,
  ClipboardListIcon,
  ContactIcon,
  HeartPulseIcon,
  LayoutListIcon,
  MessageSquareIcon,
  PencilRulerIcon,
  ShoppingCartIcon,
  StethoscopeIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import {
  isActiveRoute,
  navGroups,
  navHref,
  opensInNewTab,
  type NavGroup,
  type NavId,
  type NavItem,
} from "@/schemas";
import { mergeTailwindClasses } from "@/lib/utils";

const ICONS: Record<NavId, LucideIcon> = {
  leads: ContactIcon,
  embeddedFeedback: MessageSquareIcon,
  embeddedChart: StethoscopeIcon,
  embeddedClinic: HeartPulseIcon,
  workOrders: ClipboardListIcon,
  fillTogether: UsersRoundIcon,
  editTogether: PencilRulerIcon,
  mySurveys: LayoutListIcon,
  starter: ShoppingCartIcon,
  definition: BracesIcon,
};

const ITEM_CLASS =
  "group flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";

function ItemBody({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.id];
  const external = opensInNewTab(item);
  return (
    <>
      <Icon
        className={mergeTailwindClasses(
          "mt-0.5 size-4 shrink-0",
          active
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground",
        )}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 font-medium">
          {item.label}
          {external && (
            <>
              <span
                aria-hidden
                className="text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground text-xs"
              >
                {/* U+FE0E: the text glyph, not the emoji some platforms substitute. */}
                {"↗︎"}
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </>
          )}
        </span>
        <span className="text-muted-foreground text-xs leading-tight">
          {item.description}
        </span>
      </span>
    </>
  );
}

function Group({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
      <p
        id={labelId}
        className="text-muted-foreground px-3 pt-4 pb-1 text-[11px] font-medium tracking-wide uppercase"
      >
        {group.label}
      </p>
      {group.items.map((item) => {
        // Another site, or a page pretending to be one: a new tab, never active.
        if (opensInNewTab(item)) {
          return (
            <a
              key={item.id}
              href={navHref(item)}
              target="_blank"
              rel="noreferrer"
              onClick={onNavigate}
              className={mergeTailwindClasses(
                ITEM_CLASS,
                "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <ItemBody item={item} active={false} />
            </a>
          );
        }

        const active = isActiveRoute(pathname, navHref(item));
        return (
          <Link
            key={item.id}
            href={navHref(item)}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={mergeTailwindClasses(
              ITEM_CLASS,
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <ItemBody item={item} active={active} />
          </Link>
        );
      })}
    </div>
  );
}

/**
 * The admin sidebar, built from `navGroups`, which already leaves out the rows
 * for another edition.
 *
 * Nothing here knows which edition it is in or special-cases a row. A row's
 * data decides everything about it — where it goes, whether it opens in a new
 * tab and carries the ↗.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col px-3 pb-3">
      {navGroups.map((group) => (
        <Group key={group.id} group={group} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}
