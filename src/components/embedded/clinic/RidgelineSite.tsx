"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  CalendarCheckIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  HeartPulseIcon,
  LanguagesIcon,
  MapPinIcon,
  MoonIcon,
  PhoneIcon,
  StethoscopeIcon,
  SunIcon,
  TriangleAlertIcon,
  UserRoundIcon,
} from "lucide-react";
import {
  formatDollars,
  getPlan,
  textFor,
  type ClinicLocale,
  type VisitSummary,
} from "@/schemas";
import { Button } from "@/components/ui/button";
import { SignedInChip } from "../shared/SignedInChip";
import { accountText } from "../shared/demo-accounts";
import { mergeTailwindClasses } from "@/lib/utils";
import { RIDGELINE_BANNER, RIDGELINE_STRINGS } from "./ridgeline-strings";

/**
 * Ridgeline Family Health — a fictional US primary-care group.
 *
 * The page is the header, the form and the panel the form drives, and nothing
 * else: a visitor sees the appointment request and the summary it writes without
 * scrolling, which is the claim the page exists to make. What is left of the site
 * around it is the chrome a US patient reads without thinking — the utility bar
 * with the phone number and the patient portal, the signed-in corner with the
 * medical record number, and the notice that the whole practice is invented.
 *
 * Every string here comes from `ridgeline-strings.ts`, because the page speaks
 * the language the patient's chart asks for. The form speaks it too, from its own
 * definition; the two are switched together by `RidgelineDemo`.
 *
 * Plain shadcn surfaces throughout — no bespoke CSS, and nothing here touches an
 * `.sd-` class. No photographs either, so the demo carries no image licences.
 */

/* ── chrome ─────────────────────────────────────────────────────────────────── */

/**
 * Light and dark, where a real site puts it: in its own utility bar.
 *
 * It is not a demo control — every visitor expects a site to have one — so it
 * belongs to the host page rather than to the reviewer's toolbar. The label only
 * appears once mounted, because the server has no way to know which scheme the
 * browser will resolve.
 */
function SchemeToggle({ locale }: { locale: ClinicLocale }) {
  const strings = RIDGELINE_STRINGS[locale];
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
      aria-label={isDark ? strings.switchToLight : strings.switchToDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <MoonIcon className="size-3.5" /> : <SunIcon className="size-3.5" />}
      {isDark ? strings.schemeDark : strings.schemeLight}
    </button>
  );
}

export function ClinicUtilityBar({ locale }: { locale: ClinicLocale }) {
  const strings = RIDGELINE_STRINGS[locale];

  return (
    <div className="bg-muted/50 border-b text-xs">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-6 py-2">
        <span className="text-foreground flex items-center gap-1.5 font-medium">
          <PhoneIcon className="size-3.5" /> (503) 555-0148
        </span>
        <span className="flex items-center gap-1.5">
          <ClockIcon className="size-3.5" /> {strings.urgentCareHours}
        </span>
        <span className="ml-auto flex items-center gap-x-5">
          <span>{strings.payBill}</span>
          <span className="text-foreground font-medium">{strings.patientPortal}</span>
          <SchemeToggle locale={locale} />
        </span>
      </div>
    </div>
  );
}

/**
 * The page's language, as a two-button segmented control.
 *
 * Present for every patient and at every width — the nav beside it is what hides
 * below `lg`, not this: a patient who was handed the wrong language must always
 * be able to fix it. Each button carries its own `lang` and the language's name
 * in full, so "ES" is announced as Spanish rather than spelled out in English.
 */
export function LocaleSwitch({
  locale,
  onLocaleChange,
  className,
}: {
  locale: ClinicLocale;
  onLocaleChange: (next: ClinicLocale) => void;
  className?: string;
}) {
  const strings = RIDGELINE_STRINGS[locale];
  const options: readonly { readonly value: ClinicLocale; readonly short: string; readonly full: string }[] = [
    { value: "en", short: "EN", full: strings.englishFull },
    { value: "es", short: "ES", full: strings.spanishFull },
  ];

  return (
    <div
      role="group"
      aria-label={strings.languageGroup}
      className={mergeTailwindClasses(
        "bg-background/60 flex items-center rounded-full border p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          lang={option.value}
          title={option.full}
          aria-pressed={locale === option.value}
          onClick={() => onLocaleChange(option.value)}
          className={mergeTailwindClasses(
            "focus-visible:ring-ring/50 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            locale === option.value
              ? "demo-brand-bg text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}

export function ClinicHeader({
  onRequest,
  account,
  locale,
  onLocaleChange,
}: {
  onRequest: () => void;
  /** The patient whose portal record the form is rendered from. */
  account: Record<string, unknown>;
  locale: ClinicLocale;
  onLocaleChange: (next: ClinicLocale) => void;
}) {
  const strings = RIDGELINE_STRINGS[locale];
  const mrn = accountText(account, "mrn");
  // The chart stores the plan’s id, and the plan’s name is a proper noun in
  // both languages. Reading a label the chart does not carry is how this line
  // used to say "no plan on file" to a patient who had one.
  const plan = getPlan(accountText(account, "healthPlanOnFile"))?.name ?? strings.noPlanOnFile;

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="demo-brand-bg text-primary-foreground grid size-9 place-items-center rounded-lg">
            <HeartPulseIcon className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">Ridgeline</span>
            <span className="text-muted-foreground block text-[11px]">Family Health</span>
          </span>
        </div>

        <nav className="text-muted-foreground hidden items-center gap-6 text-sm lg:flex">
          {strings.nav.map((item, index) => (
            <span key={item} className={index === 0 ? "text-foreground font-medium" : undefined}>
              {item}
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitch locale={locale} onLocaleChange={onLocaleChange} />
          <SignedInChip
            account={account}
            meta={mrn ? `${strings.mrn} ${mrn} · ${plan}` : undefined}
            signInLabel={strings.signIn}
          />
          <Button size="sm" onClick={onRequest}>
            <CalendarCheckIcon />
            {strings.requestAppointment}
          </Button>
        </div>
      </div>
    </header>
  );
}

/**
 * Why the page is in Spanish, said in both languages.
 *
 * It appears because the chart asked for Spanish, and it stays — reworded — after
 * a visitor switches to English, because the chart still says what it says and
 * the banner is also the way back. Both lines are always rendered, current
 * language first: whoever is reading over the patient's shoulder can follow it
 * too, and a screen reader needs the `lang` on each to pronounce either.
 */
export function ChartLanguageBanner({
  name,
  locale,
  switchedToEnglish,
  onLocaleChange,
}: {
  /** The chart's preferred name, exactly as the record stores it. */
  name: string;
  locale: ClinicLocale;
  switchedToEnglish: boolean;
  onLocaleChange: (next: ClinicLocale) => void;
}) {
  const order: readonly ClinicLocale[] = locale === "es" ? ["es", "en"] : ["en", "es"];

  return (
    <div
      role="note"
      className="border-primary/40 bg-primary/5 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3 text-xs leading-relaxed"
    >
      <LanguagesIcon className="text-primary size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {order.map((line) => (
          <p
            key={line}
            lang={line}
            className={line === locale ? "font-medium" : "text-muted-foreground"}
          >
            {RIDGELINE_BANNER[line](name, switchedToEnglish)}
          </p>
        ))}
      </div>
      <LocaleSwitch locale={locale} onLocaleChange={onLocaleChange} />
    </div>
  );
}

/* ── the live panel ─────────────────────────────────────────────────────────── */

export function VisitSummaryPanel({
  summary,
  submitted,
  onChangeAnswers,
  locale,
}: {
  summary: VisitSummary;
  submitted: boolean;
  onChangeAnswers: () => void;
  locale: ClinicLocale;
}) {
  const strings = RIDGELINE_STRINGS[locale];

  return (
    <aside
      aria-label={strings.panelHeading}
      aria-live="polite"
      // `self-start` is what makes the card hug its own content: a grid item
      // stretches to the row by default, and beside a form this tall that is a
      // metre of empty card — and a sticky box that never comes unstuck.
      className="bg-card sticky top-24 self-start rounded-xl border p-5 shadow-sm"
    >
      <h2 className="text-[15px] font-semibold">{strings.panelHeading}</h2>

      {!summary.started ? (
        <p className="text-muted-foreground mt-2 text-sm">{strings.panelEmpty}</p>
      ) : (
        <>
          {submitted ? (
            <div className="border-primary/40 bg-primary/5 mt-3 rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <CheckIcon className="text-primary size-4" /> {strings.requestReceived}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">{strings.requestReceivedNote}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onChangeAnswers}>
                {strings.changeAnswers}
              </Button>
            </div>
          ) : null}

          <div className="mt-4 space-y-3 text-sm">
            {summary.reason ? (
              <Row
                icon={StethoscopeIcon}
                label={strings.rowReason}
                value={textFor(summary.reason.label, locale)}
              />
            ) : null}
            {summary.location ? (
              <Row
                icon={MapPinIcon}
                label={strings.rowOffice}
                value={`${summary.location.name} — ${summary.location.address1}, ${summary.location.city}`}
              />
            ) : null}
            <Row
              icon={UserRoundIcon}
              label={strings.rowClinician}
              value={
                summary.provider
                  ? `${summary.provider.name}, ${summary.provider.credential}`
                  : strings.firstAvailable
              }
            />
            <Row icon={ClockIcon} label={strings.rowWhen} value={summary.whenText} />
            {summary.newPatient ? (
              <Row icon={FileTextIcon} label={strings.rowPatient} value={strings.newPatient} />
            ) : null}
          </div>

          {summary.estimate !== null ? (
            <div className="bg-muted/40 mt-4 rounded-lg border p-4">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                {summary.selfPay ? strings.selfPayPrice : strings.estimatedDue}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {formatDollars(summary.estimate, locale)}
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                {summary.estimateLabel}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-4 text-xs">{summary.estimateLabel}</p>
          )}

          {summary.referralNeeded ? (
            <p className="border-destructive/40 bg-destructive/5 mt-3 flex gap-2 rounded-lg border p-3 text-xs leading-relaxed">
              <TriangleAlertIcon className="text-destructive mt-0.5 size-4 shrink-0" />
              <span>{strings.referral(summary.plan?.name ?? "")}</span>
            </p>
          ) : null}

          {summary.urgent ? (
            <p className="border-primary/40 bg-primary/5 mt-3 flex gap-2 rounded-lg border p-3 text-xs leading-relaxed">
              <ClockIcon className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{strings.urgentNote}</span>
            </p>
          ) : null}

          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-medium tracking-wide uppercase">{strings.whatToBring}</p>
            <ul className="text-muted-foreground mt-2 space-y-1.5 text-sm">
              {summary.bring.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckIcon className="text-primary mt-0.5 size-3.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </aside>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof StethoscopeIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="leading-snug">{value}</p>
      </div>
    </div>
  );
}

/**
 * One block: who this is, and that none of it is real.
 *
 * The disclaimer is the only part of the old four-column footer worth keeping on
 * a page whose whole argument is that the form is above the fold.
 */
export function ClinicFooter({ locale }: { locale: ClinicLocale }) {
  return (
    <footer className="bg-muted/30 border-t py-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex items-center gap-2">
          <span className="demo-brand-bg text-primary-foreground grid size-7 place-items-center rounded-md">
            <HeartPulseIcon className="size-4" />
          </span>
          <span className="text-sm font-semibold">Ridgeline Family Health</span>
        </div>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          {RIDGELINE_STRINGS[locale].disclaimer}
        </p>
      </div>
    </footer>
  );
}
