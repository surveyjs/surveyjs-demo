import type { ReactNode } from "react";
import {
  ActivityIcon,
  ArrowRightIcon,
  CalendarRangeIcon,
  CheckIcon,
  GaugeIcon,
  GitBranchIcon,
  InboxIcon,
  LayoutGridIcon,
  PlayIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedInChip } from "../shared/SignedInChip";
import { accountText } from "../shared/demo-accounts";
import { mergeTailwindClasses } from "@/lib/utils";
import { CADENCE_PLANS } from "@/schemas";

/** The host's own header shows the plan's name; the account carries its value. */
function planName(account: Record<string, unknown>): string {
  return CADENCE_PLANS.find((plan) => plan.value === account.plan)?.text ?? "Free";
}

/**
 * A mock marketing site for a fictional product, "Cadence".
 *
 * Its only job is to be an ordinary, believable host page: the point of the
 * embedded demo is that the survey inside it is not framed, not iframed and not
 * restyled — it reads the same shadcn tokens as the buttons and cards here, so
 * it belongs to the page rather than sitting on top of it.
 *
 * Nothing here is a real company, and the footer says so.
 */

export const PRODUCT = "Cadence";

export function CadenceMark({ className }: { className?: string }) {
  return (
    <span
      className={mergeTailwindClasses(
        "demo-brand-bg text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <path
          d="M4 15c2.5 0 3-9 5.5-9S12 18 14.5 18 20 9 20 9"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

const NAV_LINKS = ["Product", "Solutions", "Changelog", "Pricing", "Docs"];

export function SiteHeader({
  onFeedback,
  account,
}: {
  onFeedback: () => void;
  /** The signed-in workspace member — the survey is rendered for them too. */
  account: Record<string, unknown>;
}) {
  return (
    <header className="bg-background/70 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <CadenceMark />
          <span className="text-[15px] font-semibold tracking-tight">{PRODUCT}</span>
        </a>

        <nav aria-label="Cadence" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#top"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onFeedback}
            className="hidden sm:inline-flex"
          >
            Give feedback
          </Button>
          <SignedInChip
            account={account}
            meta={`${planName(account)} plan · ${accountText(
              account,
              "company",
            )}`}
          />
        </div>
      </div>
    </header>
  );
}

/**
 * The hero, with the survey as its second column.
 *
 * The survey shares the first screen with the headline on purpose: a demo whose
 * whole claim is "the form belongs to this page" cannot ask you to scroll before
 * you see the form. It also happens to be where a real site puts a form.
 *
 * The survey column is the wider of the two because below roughly 600px
 * survey-core switches its matrix question to a stacked layout, and the demo
 * should show the desktop one.
 */
export function Hero({ children }: { children: ReactNode }) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="demo-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="demo-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 pt-12 pb-16 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:pt-16">
        <div className="lg:pt-4">
          <span className="demo-brand-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <SparklesIcon className="size-3.5" />
            {PRODUCT} 3.0 — rollups
          </span>

          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">
            Plan the week.
            <br />
            <span className="demo-gradient-text">Ship the quarter.</span>
          </h1>

          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            {PRODUCT} turns scattered updates into one plan your team actually opens —
            timelines, capacity and status that stay true without a Monday meeting.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" className="demo-brand-bg gap-2 hover:opacity-90">
              Start free
              <ArrowRightIcon />
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <PlayIcon />
              Watch the tour
            </Button>
          </div>

          <p className="text-muted-foreground mt-4 text-xs">
            Free for 14 days · No credit card · SOC 2 Type II
          </p>

          <div className="text-muted-foreground/70 mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-semibold tracking-[0.18em]">
            {["NORTHWIND", "HALCYON", "KESTREL", "BLUEPEAK"].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>

        <div id="feedback" className="min-w-0 scroll-mt-20">
          {children}
        </div>
      </div>
    </section>
  );
}

const BOARD = [
  {
    title: "Now",
    tone: "demo-brand-bg",
    cards: [
      { name: "Timeline rollups", meta: "Ana · 4 of 6", progress: 66 },
      { name: "Capacity warnings", meta: "Priya · 2 of 5", progress: 40 },
    ],
  },
  {
    title: "Next",
    tone: "bg-chart-2",
    cards: [
      { name: "Scenario branches", meta: "Marco · planning", progress: 15 },
      { name: "Slack digest v2", meta: "Unassigned", progress: 0 },
    ],
  },
  {
    title: "Later",
    tone: "bg-muted-foreground",
    cards: [{ name: "Portfolio dashboards", meta: "Q3 · shaping", progress: 0 }],
  },
];

/** A hand-built stand-in for a product screenshot — no image assets required. */
export function AppPreview() {
  return (
    <section className="relative mx-auto -mt-2 w-full max-w-6xl px-6 pb-20">
      <div className="bg-card overflow-hidden rounded-xl border shadow-2xl">
        <div className="bg-muted/50 flex h-9 items-center gap-2 border-b px-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
            <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
            <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
          </span>
          <span className="text-muted-foreground bg-background/70 mx-auto rounded px-3 py-0.5 text-[11px]">
            app.cadence.example / plan / this-week
          </span>
        </div>

        <div className="flex min-h-[22rem]">
          <div className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r py-4 sm:flex">
            {[LayoutGridIcon, CalendarRangeIcon, ActivityIcon, InboxIcon, SettingsIcon].map(
              (Icon, index) => (
                <span
                  key={index}
                  className={mergeTailwindClasses(
                    "flex size-8 items-center justify-center rounded-md",
                    index === 0 ? "demo-brand-soft" : "text-muted-foreground/60",
                  )}
                >
                  <Icon className="size-4" />
                </span>
              ),
            )}
          </div>

          <div className="min-w-0 flex-1 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-[11px]">Plan / Q2 / Week 18</p>
                <p className="text-sm font-medium">Growth platform</p>
              </div>
              <div className="flex -space-x-2" aria-hidden>
                {["AN", "PR", "MC", "JD"].map((initials) => (
                  <span
                    key={initials}
                    className="bg-secondary text-secondary-foreground ring-card flex size-7 items-center justify-center rounded-full text-[10px] font-medium ring-2"
                  >
                    {initials}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {BOARD.map((column) => (
                <div key={column.title} className="min-w-0">
                  <p className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wide uppercase">
                    <span className={mergeTailwindClasses("size-1.5 rounded-full", column.tone)} />
                    {column.title}
                  </p>
                  <div className="flex flex-col gap-2">
                    {column.cards.map((card) => (
                      <div key={card.name} className="bg-background rounded-lg border p-3">
                        <p className="truncate text-[13px] font-medium">{card.name}</p>
                        <p className="text-muted-foreground mt-0.5 text-[11px]">{card.meta}</p>
                        <span className="bg-muted mt-2.5 block h-1 overflow-hidden rounded-full">
                          <span
                            className="demo-brand-bg block h-full rounded-full"
                            style={{ width: `${card.progress}%` }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden w-56 shrink-0 border-l p-5 xl:block">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Capacity
            </p>
            <div className="mt-4 flex h-32 items-end gap-2" aria-hidden>
              {[42, 58, 71, 64, 88, 52, 34].map((height, index) => (
                <span
                  key={index}
                  className={mergeTailwindClasses("flex-1 rounded-t", index === 4 ? "demo-brand-bg" : "bg-muted")}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
              Thursday is over committed by 1.5 days.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { value: "14,000+", label: "teams planning weekly" },
  { value: "38%", label: "fewer status meetings" },
  { value: "4.9/5", label: "average customer rating" },
  { value: "99.99%", label: "uptime, last 12 months" },
];

export function Stats() {
  return (
    <section className="border-y">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="text-muted-foreground mt-1 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: ZapIcon,
    title: "Rollups that stay true",
    body: "Every task rolls into the plan the moment it moves, so the timeline is never a Monday re-keying exercise.",
  },
  {
    icon: GitBranchIcon,
    title: "Branch a plan, merge it back",
    body: "Try next quarter on a copy of the timeline, compare it side by side, then merge the version that survived.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Yours to host",
    body: "SOC 2 Type II, SSO, a full audit log, and a self-hosted option that runs inside your own VPC.",
  },
];

export function Features() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-20">
      <p className="demo-brand-text text-xs font-semibold tracking-[0.18em] uppercase">
        Why teams switch
      </p>
      <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
        The plan updates itself. You get the week back.
      </h2>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="bg-card rounded-xl border p-6">
            <span className="demo-brand-soft flex size-9 items-center justify-center rounded-lg">
              <feature.icon className="size-4" />
            </span>
            <h3 className="mt-4 text-base font-medium">{feature.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const MODULES = [
  {
    icon: CalendarRangeIcon,
    name: "Plan",
    price: "Included",
    body: "The timeline, the board and the weekly plan. Every tier has it.",
    core: true,
  },
  {
    icon: GaugeIcon,
    name: "Capacity",
    price: "$4 / person",
    body: "Workload and staffing warnings before the week is overcommitted.",
    core: false,
  },
  {
    icon: LayoutGridIcon,
    name: "Portfolio",
    price: "$6 / person",
    body: "Rollups across every project, in one view your execs will actually open.",
    core: false,
  },
  {
    icon: ActivityIcon,
    name: "Insights",
    price: "$5 / person",
    body: "Cycle time, throughput and forecast accuracy, without a spreadsheet.",
    core: false,
  },
];

/**
 * The product suite the plan finder reasons about: one core module plus three
 * paid ones. The prices here are the ones `planFinderJson` prices a
 * recommendation with, so the survey and the page never disagree.
 */
export function Suite() {
  return (
    <section className="border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <p className="demo-brand-text text-xs font-semibold tracking-[0.18em] uppercase">
          The suite
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          One core, three modules. Switch them on when you need them.
        </h2>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm">
          Modules turn on per workspace, with no migration and no separate login.
          Business includes all three.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((entry) => (
            <div
              key={entry.name}
              className={mergeTailwindClasses(
                "bg-card flex flex-col rounded-xl border p-5",
                entry.core && "demo-brand-soft border-transparent",
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <entry.icon className="size-5" />
                <span className="text-xs font-medium">{entry.price}</span>
              </span>
              <p className="mt-4 text-base font-medium">{entry.name}</p>
              <p
                className={mergeTailwindClasses(
                  "mt-2 text-sm leading-relaxed",
                  entry.core ? "opacity-80" : "text-muted-foreground",
                )}
              >
                {entry.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const QUOTES = [
  {
    quote:
      "We deleted two recurring meetings the week we moved. The plan was simply correct every morning.",
    name: "Ana Ferreira",
    role: "Director of Engineering, Northwind",
    initials: "AF",
  },
  {
    quote:
      "Scenario branches settled a quarter of arguing in about forty minutes. That alone paid for the year.",
    name: "Marco Lindqvist",
    role: "Head of Product, Halcyon",
    initials: "ML",
  },
  {
    quote:
      "Our security review is usually where tools die. Self-hosting and the audit log ended it in one call.",
    name: "Priya Raman",
    role: "VP Operations, Kestrel",
    initials: "PR",
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/30 border-y">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Teams that stopped guessing
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {QUOTES.map((item) => (
            <figure key={item.name} className="bg-card flex flex-col rounded-xl border p-6">
              <blockquote className="text-[15px] leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="demo-brand-soft flex size-9 items-center justify-center rounded-full text-xs font-medium">
                  {item.initials}
                </span>
                <span className="text-sm">
                  <span className="block font-medium">{item.name}</span>
                  <span className="text-muted-foreground block text-xs">{item.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    note: "up to 5 people",
    features: ["Plan module", "One workspace", "Community support"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$12",
    note: "per person / month",
    features: [
      "Everything in Starter",
      "Unlimited workspaces",
      "Modules à la carte",
      "All integrations",
    ],
    cta: "Start 14-day trial",
    highlighted: false,
  },
  {
    name: "Business",
    price: "$19",
    note: "per person / month",
    features: [
      "Everything in Team",
      "All three modules included",
      "SSO and audit log",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Talk to us",
    note: "annual, invoiced",
    features: ["Self-hosted in your VPC", "Custom SLA", "Named success engineer"],
    cta: "Book a call",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-20">
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Simple pricing, no seat games
      </h2>
      <p className="text-muted-foreground mt-3 max-w-xl text-sm">
        Every plan includes the Plan module. You pay for the modules you switch on, for
        scale, and for the controls your security team asks about.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={mergeTailwindClasses(
              "bg-card relative flex flex-col rounded-xl border p-6",
              plan.highlighted && "border-transparent shadow-lg",
            )}
            style={
              plan.highlighted ? { boxShadow: "0 0 0 2px var(--demo-brand)" } : undefined
            }
          >
            {plan.highlighted && (
              <span className="demo-brand-bg text-primary-foreground absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                Most popular
              </span>
            )}
            <p className="text-sm font-medium">{plan.name}</p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
              <span className="text-muted-foreground text-xs">{plan.note}</span>
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="demo-brand-text mt-0.5 size-4 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className={mergeTailwindClasses("mt-6 w-full", plan.highlighted && "demo-brand-bg hover:opacity-90")}
              variant={plan.highlighted ? "default" : "outline"}
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ClosingBand({ onFeedback }: { onFeedback: () => void }) {
  return (
    <section className="relative overflow-hidden border-t">
      <div className="demo-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready for a calmer week?
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-sm">
          Bring one project across in an afternoon. If the plan is not truer by Friday, we
          will help you export everything back out.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="demo-brand-bg gap-2 hover:opacity-90">
            Start free
            <ArrowRightIcon />
          </Button>
          <Button size="lg" variant="outline" onClick={onFeedback}>
            Tell us what to fix
          </Button>
        </div>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS: readonly { title: string; links: readonly string[] }[] = [
  { title: "Product", links: ["Plan view", "Capacity", "Scenario branches", "Integrations"] },
  { title: "Solutions", links: ["Engineering", "Product", "Agencies", "Operations"] },
  { title: "Resources", links: ["Docs", "Changelog", "Templates", "Status"] },
  { title: "Company", links: ["About", "Careers", "Security", "Contact"] },
];

export function SiteFooter() {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <span className="flex items-center gap-2.5">
              <CadenceMark />
              <span className="text-[15px] font-semibold tracking-tight">{PRODUCT}</span>
            </span>
            <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
              Planning that keeps up with the week, for teams who would rather ship than
              report.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold tracking-wide uppercase">{column.title}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#top"
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground mt-12 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Cadence Labs — a fictional company invented for this demo.</p>
          <p>
            The page is a mock. The survey in it is a real{" "}
            <a
              href="https://surveyjs.io/form-library"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              SurveyJS
            </a>{" "}
            form.
          </p>
        </div>
      </div>
    </footer>
  );
}

const EMBED_NOTES = [
  {
    title: "Server-rendered with the page",
    body: "The questions are in the HTML this route sends, before any JavaScript runs. View source and they are there.",
  },
  {
    title: "Styled by this site's tokens",
    body: "No survey theme to maintain. The form reads the same shadcn variables as the buttons around it — brand colour and dark mode included.",
  },
  {
    title: "One JSON, rendered for you",
    body: "The definition is a document, and it reads your account: the greeting, the answers already filled in, and which questions you get at all.",
  },
];

/**
 * A short band explaining what the visitor is looking at.
 *
 * It replaces the usual "and here is our survey" section: the survey is already
 * in the hero, so this only has to say why it looks native.
 */
export function EmbedNotes() {
  return (
    <section className="border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <p className="demo-brand-text text-xs font-semibold tracking-[0.18em] uppercase">
          Embedded, not bolted on
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
          That form above is not a screenshot.
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {EMBED_NOTES.map((note) => (
            <div key={note.title}>
              <p className="flex items-start gap-2 text-sm font-medium">
                <CheckIcon className="demo-brand-text mt-0.5 size-4 shrink-0" />
                {note.title}
              </p>
              <p className="text-muted-foreground mt-2 pl-6 text-sm leading-relaxed">
                {note.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
