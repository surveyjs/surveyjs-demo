"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  BlocksIcon,
  ChartColumnIcon,
  ChevronDownIcon,
  Code2Icon,
  FileDownIcon,
  LayersIcon,
  MoonIcon,
  PencilRulerIcon,
  RotateCcwIcon,
  SunIcon,
  UserRoundIcon,
  UsersRoundIcon,
  WandSparklesIcon,
  type LucideIcon,
} from "lucide-react";
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
import { mergeTailwindClasses } from "@/lib/utils";
import { PAGE_ACTIONS } from "@/lib/site";
import { features, type Features } from "@/features";

/** Where the demos came from — the template's own admin shell. */
const HOME = "/";

/** The edition config names an icon; React lives here, not in the config. */
const DESIGNER_ICONS: Record<Features["designer"]["icon"], LucideIcon> = {
  json: Code2Icon,
  designer: PencilRulerIcon,
};

/**
 * The reviewer's toolbar, floating over the mock site.
 *
 * Every control exists to make a single claim checkable:
 *
 *  - **The editor link** (`features.designer`) — the form is a JSON document,
 *    edited in one place that covers every form in the template. What is saved
 *    there is what this page renders, which is the round trip a buyer is asking
 *    about;
 *  - **Prefill / Reset** — so the rest can be shown on a filled form at once;
 *  - **PDF / Analytics**, in editions that ship them — the same definition as a
 *    document, and the same definition as a dashboard: one form, three products;
 *  - **Login as** — the demo's preset users. The same definition, a different
 *    person, and the form changes shape;
 *  - **Edit the user** — that person's record in a popup, whose editor is itself
 *    a SurveyJS survey with the resulting object shown as JSON underneath;
 *
 * The outline around the survey is not in here: it is always on, because "which
 * part of this page is the form?" is the first thing anyone asks.
 *
 * It is deliberately quiet — half-transparent until pointed at — because the
 * demo's claim is that the survey belongs to the page, and a loud control panel
 * hovering over it would undercut that. Nothing here would ship in a host site.
 */
export function DemoDock({
  onPrefill,
  onReset,
  onEditUser,
  onExportPdf,
  configureHref,
  howHref,
  analyticsHref,
  users,
  activeUserId,
  onSelectUser,
  edited,
  userOpen,
  showTheme = true,
  usersLabel = "Login as",
  editLabel = "Edit the user",
}: {
  onPrefill: () => void;
  onReset: () => void;
  onEditUser: () => void;
  /**
   * Downloads the form, with whatever has been answered, as a PDF. No button
   * renders without it.
   */
  onExportPdf?: () => void;
  /** The one page this form's JSON is edited on. */
  configureHref: string;
  /**
   * This demo's "How this page is built" explainer. A plain link, in a new tab:
   * the drawer the admin pages open belongs to the template's own chrome, and
   * this page is pretending to be somebody else's website.
   */
  howHref?: string;
  /** The dashboard for this form's responses. No link renders without it. */
  analyticsHref?: string;
  /** The users the admin keeps for this demo. One is the shipped default. */
  users: readonly { id: string; name: string; description?: string }[];
  activeUserId: string;
  onSelectUser: (id: string) => void;
  /** The account has been changed in this window — worth a dot on the button. */
  edited: boolean;
  userOpen: boolean;
  /** False where the host site has a colour-scheme control of its own. */
  showTheme?: boolean;
  /**
   * What signing in as somebody means on this site. "Login as" is right for a
   * product; the clinician's workspace opens a patient's chart instead.
   */
  usersLabel?: string;
  editLabel?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const divider = (
    <span className="bg-border mx-0.5 h-5 w-px shrink-0" aria-hidden />
  );
  const activeUser =
    users.find((option) => option.id === activeUserId) ?? users[0];
  const DesignerIcon = DESIGNER_ICONS[features.designer.icon];

  return (
    // One row, as wide as its contents: every label here can truncate, so a
    // narrow window squeezes the longest of them rather than pushing a control
    // off the screen.
    <div
      data-demo-dock=""
      // The reviewer’s toolbar, not the host site: it stays English on a page
      // rendered in another language, and says so to a screen reader.
      lang="en"
      className="demo-dock bg-background/85 pointer-events-auto fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-[70] flex max-w-[calc(100svw-2rem)] -translate-x-1/2 flex-nowrap items-center gap-1 rounded-full border px-2 py-1.5 shadow-lg backdrop-blur"
      role="toolbar"
      aria-label="Embedded demo tools"
    >
      {/* The way back: these pages carry none of the template's chrome, and the
          sidebar entries open them in a new tab. */}
      <a
        href={HOME}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex min-w-0 items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] font-medium tracking-wide uppercase transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        title="Back to the SurveyJS demos"
      >
        <LayersIcon className="size-3.5" />
        <span className="hidden truncate lg:inline">SurveyJS demos</span>
      </a>

      {howHref && (
        <a
          href={howHref}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex min-w-0 items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] font-medium tracking-wide uppercase transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          title={PAGE_ACTIONS.howBuilt}
        >
          <BlocksIcon className="size-3.5" />
          <span className="hidden truncate xl:inline">{PAGE_ACTIONS.howBuilt}</span>
        </a>
      )}

      {divider}

      {/* The one control that is meant to be pressed, so the one painted in the
          host brand rather than hidden in the greys. */}
      <Button
        asChild
        size="sm"
        className="demo-brand-bg text-primary-foreground min-w-0 gap-1.5 rounded-full font-semibold shadow-sm hover:opacity-90"
      >
        <a href={configureHref} title={features.designer.hint}>
          <DesignerIcon />
          <span className="truncate">{features.designer.label}</span>
        </a>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5 rounded-full"
        title="Fill every page with sample answers"
        onClick={onPrefill}
      >
        <WandSparklesIcon />
        <span className="hidden xl:inline">Prefill</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5 rounded-full"
        title="Clear the answers and start the form again"
        onClick={onReset}
      >
        <RotateCcwIcon />
        <span className="hidden xl:inline">Reset</span>
      </Button>

      {onExportPdf && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 rounded-full"
          title="Download this form, with the answers so far, as a PDF"
          onClick={onExportPdf}
        >
          <FileDownIcon />
          <span className="hidden xl:inline">Save to PDF</span>
        </Button>
      )}

      {analyticsHref && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 rounded-full"
          asChild
        >
          <a
            href={analyticsHref}
            title="Charts built from this form's responses — SurveyJS Dashboard reads the same definition"
          >
            <ChartColumnIcon />
            <span className="hidden xl:inline">Analytics</span>
          </a>
        </Button>
      )}

      {divider}

      {/* The picker, once the back office holds more than one person.
          `modal={false}`: a modal dropdown locks the page scroll, and taking the
          scrollbar away shifts this centred, fixed toolbar sideways. */}
      {users.length > 1 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="min-w-0 gap-1.5 rounded-full"
              title="Sign in as somebody else — the same form, a different person"
            >
              <UsersRoundIcon />
              <span className="hidden max-w-32 truncate sm:inline">
                {usersLabel}: {activeUser?.name}
              </span>
              <ChevronDownIcon className="opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          {/* Above the toolbar itself (z-70), which is fixed over the page. */}
          <DropdownMenuContent align="center" className="z-[80] w-72">
            <DropdownMenuLabel>{usersLabel}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={activeUserId}
              onValueChange={onSelectUser}
            >
              {users.map((option) => (
                <DropdownMenuRadioItem key={option.id} value={option.id}>
                  <span className="flex flex-col">
                    <span>{option.name}</span>
                    {option.description && (
                      <span className="text-muted-foreground text-xs">{option.description}</span>
                    )}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button
        variant={userOpen ? "secondary" : "ghost"}
        size="sm"
        className={mergeTailwindClasses(
          "min-w-0 gap-1.5 rounded-full",
          userOpen && "shadow-inner",
        )}
        aria-pressed={userOpen}
        aria-label={editLabel}
        title="Change the signed-in user the form is rendered for — the editor is a SurveyJS form too"
        onClick={onEditUser}
      >
        <UserRoundIcon />
        <span className="hidden truncate sm:inline">{editLabel}</span>
        {edited && (
          <span
            className="bg-primary size-1.5 rounded-full opacity-70"
            aria-label="edited"
          />
        )}
      </Button>

      {/* Only where the host site has no control of its own: a colour scheme is
          the page's business, not the survey's. */}
      {showTheme && (
        <>
          {divider}
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 rounded-full"
            title={
              mounted
                ? `Switch to ${isDark ? "light" : "dark"} mode`
                : "Toggle colour scheme"
            }
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {mounted && isDark ? <MoonIcon /> : <SunIcon />}
            <span className="sr-only">Toggle colour scheme</span>
          </Button>
        </>
      )}
    </div>
  );
}
