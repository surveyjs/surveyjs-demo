"use client";

import { StethoscopeIcon } from "lucide-react";
import { CLINIC_PATIENTS } from "@/schemas";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { DemoDock } from "../shared/DemoDock";
import { DemoUserDialog } from "../shared/DemoUserDialog";
import { EmbeddedSurvey, SurveyCard } from "../shared/EmbeddedSurvey";
import { SignedInChip } from "../shared/SignedInChip";
import { RIDGELINE_USER, accountText } from "../shared/demo-accounts";
import { useDemo } from "../shared/useDemo";
import type { DemoSurvey } from "../shared/demo-controls";

const ANCHOR = "note";
export const CHART_BRAND = "violet";

/**
 * Embedded demo: the clinician's side of the clinic — an encounter note.
 *
 * The other demos put a form inside a marketing page and let the page react to
 * it, which is the right story for a public form. This one is the opposite
 * argument, for the buyer who says *our real forms are nothing like that*: an
 * internal workspace whose entire screen is one survey, eight pages long, with
 * its own table of contents, its own review step, its own arithmetic and its own
 * completion page.
 *
 * So there is deliberately almost nothing here. A header bar with the product
 * mark, the chart that is open and a colour-scheme switch — and below it the
 * survey, full width. The pages, the table of contents, the problem list, the
 * medication totals, the risk score, the signature and the "note filed" screen
 * are all in `encounter-note.ts`; not one of them is React in this file. That is the claim,
 * and the emptiness of this component is the evidence for it.
 *
 * The note is still rendered *for* somebody: the same three patients as the
 * public clinic demo, so the toolbar opens any of their charts and the note
 * changes shape around them — Priya has never been seen here, so she has a page
 * the others do not.
 */
export function ChartDemo({ survey }: { survey: DemoSurvey }) {
  const demo = useDemo({
    survey,
    user: RIDGELINE_USER,
    anchorId: ANCHOR,
    brandId: CHART_BRAND,
    roster: CLINIC_PATIENTS,
  });

  const mrn = accountText(demo.account, "mrn");

  return (
    <div className="bg-muted/30 text-foreground flex min-h-svh flex-col">
      <header className="bg-background/90 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <span
            className="demo-brand-bg text-primary-foreground grid size-8 shrink-0 place-items-center rounded-md"
            aria-hidden
          >
            <StethoscopeIcon className="size-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold tracking-tight">
              Ridgeline Chart
            </span>
            <span className="text-muted-foreground block truncate text-[11px]">
              Clinician workspace · encounter note
            </span>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <SignedInChip
              account={demo.account}
              meta={mrn ? `Chart open · MRN ${mrn}` : "Chart open"}
            />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main id={ANCHOR} className="flex-1 scroll-mt-16 px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pb-24">
          <SurveyCard>
            <EmbeddedSurvey
              key={demo.runKey}
              json={demo.json}
              data={demo.seed}
              variables={demo.variables}
              onDataChange={demo.trackAnswers}
            />
          </SurveyCard>
        </div>
      </main>

      <DemoUserDialog {...demo.userDialogProps} />
      {/* The workspace has its own light/dark control in the header. */}
      <DemoDock
        {...demo.dockProps}
        showTheme={false}
        usersLabel="Open chart"
        editLabel="Edit the chart"
      />
    </div>
  );
}
