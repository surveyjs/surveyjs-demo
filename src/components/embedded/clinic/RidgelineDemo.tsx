"use client";

import { useCallback, useMemo, useState } from "react";
import { chartLocale, visitSummaryFor, type ClinicLocale, type SurveyData } from "@/schemas";
import { DemoDock } from "../shared/DemoDock";
import { DemoUserDialog } from "../shared/DemoUserDialog";
import { EmbeddedSurvey, SurveyCard } from "../shared/EmbeddedSurvey";
import {
  ChartLanguageBanner,
  ClinicFooter,
  ClinicHeader,
  ClinicUtilityBar,
  VisitSummaryPanel,
} from "./RidgelineSite";
import { useDemo } from "../shared/useDemo";
import type { DemoSurvey } from "../shared/demo-controls";

const ANCHOR = "request";
export const RIDGELINE_BRAND = "emerald";

/**
 * Embedded demo: a US clinic page whose appointment form prices the visit.
 *
 * Healthcare is where SurveyJS actually gets bought, and this is the page it gets
 * bought for. The page is the header, the form and the panel the form drives —
 * nothing below it to scroll past, because the claim is that the form *is* the
 * page, and a claim you have to scroll to check is not one anybody checks.
 *
 * Three mechanics run at once here. The page is downstream of the form: every
 * answer flows out through `onDataChange`, `visitSummaryFor` derives the copay,
 * the referral warning and the what-to-bring list, and the panel re-renders
 * around it.
 *
 * And the form is downstream of the patient. A portal knows who you are, so the
 * office, the clinician, the plan and the identity fields all arrive filled, the
 * insurance-card fields are absent while a card is on file, and the questions
 * about existing conditions and refills are built from that patient's own chart.
 * Turn on "First visit to Ridgeline?" in the user popup and watch it invert: the
 * chart empties, Maria's four confirmations become the long form, and a page
 * appears that established patients never see.
 *
 * The third is the language, and it is the same mechanic again: `preferredLanguage`
 * is a chart field, so Maria's page opens in Spanish — the form from its own
 * definition, the site around it from `ridgeline-strings.ts` — and Daniel's opens
 * in English, with no banner, because his chart says so. The switch in the header
 * overrides that for as long as the patient and the chart stay put; change either
 * and the data wins again.
 */
export function RidgelineDemo({ survey }: { survey: DemoSurvey }) {
  const demo = useDemo({
    survey,
    anchorId: ANCHOR,
    brandId: RIDGELINE_BRAND,
    // The form's three variable presets are the patients the toolbar can sign in
    // as — the same definition, a different chart.
  });

  const { trackAnswers } = demo;
  const [data, setData] = useState<SurveyData>({});
  const [submitted, setSubmitted] = useState(false);

  /* ── which language this page is in ──────────────────────────────────────── */

  const chartLanguage = demo.account.preferredLanguage;
  const chart = chartLocale(chartLanguage);
  // Who the page is for, and what their chart says: the pair a manual override
  // belongs to. Either one changing makes the override somebody else's.
  const localeKey = `${demo.dockProps.activeUserId}:${String(chartLanguage)}`;
  const [override, setOverride] = useState<{ key: string; locale: ClinicLocale } | null>(null);

  // Ignoring a stale override is not enough — it has to be destroyed, or it comes
  // back: switch Maria to English, sign in as Daniel, sign back in as Maria, and
  // a remembered `Maria:es` would reopen her page in English. Adjusting state
  // while rendering is React's own pattern for this, and unlike an effect it
  // paints no frame in the wrong language.
  if (override && override.key !== localeKey) setOverride(null);

  const locale: ClinicLocale = override?.key === localeKey ? override.locale : chart;

  const changeLocale = useCallback(
    (next: ClinicLocale) => setOverride({ key: localeKey, locale: next }),
    [localeKey],
  );

  /* ── the answers, and what the page derives from them ────────────────────── */

  // Stable, so it never re-subscribes the survey's event handlers. The page
  // prices itself from the answers, and the toolbar's PDF button, in editions
  // that ship one, needs them too.
  const handleDataChange = useCallback(
    (next: SurveyData) => {
      setData(next);
      trackAnswers(next);
    },
    [trackAnswers],
  );

  const summary = useMemo(() => visitSummaryFor(data, locale), [data, locale]);

  const handleComplete = useCallback((next: SurveyData) => {
    setData(next);
    setSubmitted(true);
  }, []);

  const changeAnswers = useCallback(() => {
    setSubmitted(false);
    demo.resumeWith(data);
  }, [demo, data]);

  const patientName =
    (typeof demo.account.preferredName === "string" && demo.account.preferredName.trim()) ||
    (typeof demo.account.firstName === "string" && demo.account.firstName.trim()) ||
    "";

  return (
    <div lang={locale} className="bg-background text-foreground flex min-h-svh flex-col">
      <ClinicUtilityBar locale={locale} />
      <ClinicHeader
        onRequest={demo.requestSurvey}
        account={demo.account}
        locale={locale}
        onLocaleChange={changeLocale}
      />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="demo-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-6 pt-6 pb-14">
            {/* Shown because the chart asked for a language this page has, and
                kept afterwards: it is also the way back. */}
            {chart !== "en" ? (
              <ChartLanguageBanner
                name={patientName}
                locale={locale}
                switchedToEnglish={locale !== chart}
                onLocaleChange={changeLocale}
              />
            ) : null}

            {/* Form left, summary right: the estimate has to be beside the
                question that changes it. */}
            <div
              id={ANCHOR}
              className="grid scroll-mt-24 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <SurveyCard>
                  <EmbeddedSurvey
                    key={demo.runKey}
                    json={demo.json}
                    data={demo.seed}
                    variables={demo.variables}
                    locale={locale}
                    onDataChange={handleDataChange}
                    onComplete={handleComplete}
                  />
                </SurveyCard>
              </div>
              <VisitSummaryPanel
                summary={summary}
                submitted={submitted}
                onChangeAnswers={changeAnswers}
                locale={locale}
              />
            </div>
          </div>
        </section>
      </main>

      <ClinicFooter locale={locale} />

      {/* The reviewer's tools, not the clinic's site: the popup, the dock and the
          "SurveyJS renders this" label stay English in every locale, and each
          carries its own `lang="en"` so a screen reader does not read them with
          Spanish phonetics. */}
      <DemoUserDialog
        {...demo.userDialogProps}
        contextNote={
          <>
            <code className="text-foreground text-[11px]">user_preferredLanguage</code> picks the
            language the form opens in: {String(chartLanguage) || "—"} → {chart}
            {chart === "en" && chartLanguage !== "en" ? " (no translation yet)" : ""}
          </>
        }
      />
      {/* The clinic site has its own light/dark control in its utility bar. */}
      <DemoDock {...demo.dockProps} showTheme={false} />
    </div>
  );
}
