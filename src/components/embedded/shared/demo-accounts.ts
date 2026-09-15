import {
  CLINIC_PATIENTS,
  HEALTH_PLANS,
  PATIENT_LANGUAGES,
  patientRecordJson,
  type SurveyData,
  type SurveyJSON,
} from "@/schemas";

/**
 * The signed-in user each demo renders its form for — and the form used to edit
 * them, which is itself a SurveyJS survey.
 *
 * This is the second half of the pitch. The first half is that a SurveyJS form
 * can be dropped into somebody else's page and look native; this half is that the
 * same JSON definition arrives *already configured for whoever is looking at it* —
 * their name, their plan, their chart — and that the arrangement of the form
 * changes with them, not just the values in it.
 *
 * Mechanically it is one step: the account object is published to survey-core as
 * a single variable named `user` (`model.setVariable("user", account)`), and the
 * survey JSON reaches into it by path:
 *
 *  - `"title": "Hi {user.firstName}, …"` pipes the value into text;
 *  - `"defaultValueExpression": "{user.email}"` pre-answers a question;
 *  - `"visibleIf": "{user.isNewPatient} = true"` adds or removes whole pages;
 *  - `"visibleIf": "{user.conditions} contains 'asthma'"` on a *choice* builds a
 *    list out of the account.
 *
 * One variable rather than one per key, because a path can never be mistaken for
 * a question: the clinic form has questions called `firstName` and `email` too.
 *
 * Nothing here is SurveyJS-specific data: it is the shape an app already has
 * after `getSession()` or a CRM lookup. What is deliberate is where it comes from
 * in the demo — `json` below is a **survey**, so the toolbar's "Edit the user"
 * popup is the library editing the library's own input, with no bespoke form code
 * anywhere. Answers in, context object out; `toAccount` is the only translation,
 * and it exists to fill the display labels a dropdown's `value` cannot carry.
 */
/** One preset user a demo ships with, as the toolbar's picker lists them. */
export interface DemoRosterEntry {
  readonly id: string;
  readonly data: SurveyData;
}

export interface DemoUser {
  /** The editor form, rendered in the toolbar's popup. */
  readonly json: SurveyJSON;
  /** What the host app knows about the visitor when the page opens. */
  readonly defaults: SurveyData;
  /** Answers → the object handed to the survey as `user`. */
  readonly toAccount: (data: SurveyData) => Record<string, unknown>;
}

interface Choice {
  readonly value: string;
  readonly text: string;
}

/** The text behind a dropdown's value — what piping needs and `value` is not. */
function labelOf(choices: readonly Choice[], value: unknown): string {
  return choices.find((choice) => choice.value === value)?.text ?? "";
}

/** Shared shape: a live editor, so no navigation and no completion. */
const EDITOR_BASE = {
  showQuestionNumbers: "off",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  showNavigationButtons: "none",
} as const;

/* ── reading an account the reviewer may have edited ────────────────────────── */

export function accountText(
  account: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = account[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Initials for the avatar, from whatever the account currently holds. */
export function accountInitials(account: Record<string, unknown>): string {
  const first = accountText(account, "firstName");
  const last = accountText(account, "lastName");
  const initials = `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase();
  return initials || "?";
}

/** First and last name; an account that keeps one `name` (a records page's session user) shows that. */
export function accountName(account: Record<string, unknown>): string {
  return (
    [accountText(account, "firstName"), accountText(account, "lastName")]
      .filter(Boolean)
      .join(" ") || accountText(account, "name")
  );
}

/**
 * Which account keys the definition on screen actually reads.
 *
 * Found by scanning the definition for a `{user.key}` reference rather than kept
 * in a hand-written list, so the panel can never claim a key is wired when it is
 * not — including after a reviewer has typed a new one into the JSON.
 */
export function usedVariableKeys(
  json: unknown,
  account: Record<string, unknown>,
): readonly string[] {
  const source = JSON.stringify(json ?? {});
  return Object.keys(account).filter((key) => source.includes(`{user.${key}}`));
}

/* ── the product's own user (feedback demo) ─────────────────────────────────── */

const CADENCE_PLANS: readonly Choice[] = [
  { value: "free", text: "Free" },
  { value: "business", text: "Business" },
  { value: "enterprise", text: "Enterprise" },
];

/**
 * A workspace admin, fourteen months in, with an open support ticket.
 *
 * Worth changing in front of an audience: the name (the greeting follows),
 * *months as a customer* down to 1 (the plan-fit question is replaced by a whole
 * onboarding page), the plan to Free (the upgrade question instead), the ticket
 * switch (the Support step leaves the progress bar), the CSM name (renewal
 * questions arrive), or clearing the email (the form starts asking for one).
 */
export const CADENCE_USER: DemoUser = {
  json: {
    ...EDITOR_BASE,
    pages: [
      {
        name: "account",
        elements: [
          {
            type: "html",
            name: "note",
            html: "<p>This is the record the host app already has. The survey on the page behind reads it as <code>{user.…}</code>.</p>",
          },
          { type: "text", name: "firstName", title: "First name" },
          { type: "text", name: "lastName", title: "Last name", startWithNewLine: false },
          { type: "text", name: "email", title: "Email", inputType: "email" },
          { type: "text", name: "company", title: "Company" },
          { type: "text", name: "role", title: "Role", startWithNewLine: false },
          {
            type: "dropdown",
            name: "plan",
            title: "Plan",
            choices: [...CADENCE_PLANS],
          },
          {
            type: "text",
            name: "seats",
            title: "Seats",
            inputType: "number",
            min: 1,
            startWithNewLine: false,
          },
          {
            type: "text",
            name: "monthsActive",
            title: "Months as a customer",
            description: "Under 3 turns the survey into an onboarding one.",
            inputType: "number",
            min: 0,
          },
          {
            type: "text",
            name: "csmName",
            title: "Named CSM",
            description: "Blank for accounts that do not have one.",
            startWithNewLine: false,
          },
          {
            type: "boolean",
            name: "openTicket",
            title: "Open support ticket?",
            labelTrue: "Yes, one is open",
            labelFalse: "No",
          },
          {
            type: "text",
            name: "lastTicketSubject",
            title: "What it is about",
            visibleIf: "{openTicket} = true",
          },
        ],
      },
    ],
  },
  defaults: {
    firstName: "Alex",
    lastName: "Rivera",
    email: "alex.rivera@northwind.example",
    company: "Northwind Labs",
    role: "Workspace admin",
    plan: "business",
    seats: 42,
    monthsActive: 14,
    openTicket: true,
    lastTicketSubject: "SSO group sync",
    csmName: "",
  },
  toAccount: (data) => ({
    ...data,
    planLabel: labelOf(CADENCE_PLANS, data.plan),
  }),
};

/**
 * The accounts the feedback demo ships with.
 *
 * Three, because the toolbar's "Login as" is only an argument if the form comes
 * out differently for each: an established admin with an open ticket, a
 * three-week-old free account that gets an onboarding page instead of the
 * plan-fit question, and an enterprise account with a named CSM whose renewal
 * step nobody else sees. The same JSON in all three cases.
 */
export const CADENCE_ROSTER: readonly DemoRosterEntry[] = [
  { id: "rivera", data: { ...CADENCE_USER.defaults } },
  {
    id: "shah",
    data: {
      firstName: "Priya",
      lastName: "Shah",
      email: "priya.shah@lumenpath.example",
      company: "Lumenpath",
      role: "Product designer",
      plan: "free",
      seats: 3,
      monthsActive: 2,
      openTicket: false,
      lastTicketSubject: "",
      csmName: "",
    },
  },
  {
    id: "herrera",
    data: {
      firstName: "Tomás",
      lastName: "Herrera",
      email: "t.herrera@meridianfoods.example",
      company: "Meridian Foods",
      role: "Director of operations",
      plan: "enterprise",
      seats: 480,
      monthsActive: 31,
      openTicket: false,
      lastTicketSubject: "",
      csmName: "Dana Whitfield",
    },
  },
];

/* ── the patient portal record (clinic demo) ────────────────────────────────── */

/**
 * An established patient: identity and coverage on file, two conditions on the
 * chart, a refill due.
 *
 * The record itself — and the survey that edits it — lives in
 * `src/schemas/patient-record.ts`, because it is the clinic back office that owns
 * it, not this demo. All that belongs here is the translation from the stored
 * answers to the object the appointment form reads as `{user.…}`: the display
 * labels a dropdown value cannot carry.
 *
 * The lever worth throwing in front of an audience is "First visit to
 * Ridgeline?": the record has `clearInvisibleValues: "onHiddenContainer"`, so
 * turning it on empties the chart, and the appointment form on the website turns
 * from four confirmations into the long version, insurance-card fields and all.
 */
export const RIDGELINE_USER: DemoUser = {
  json: patientRecordJson,
  defaults: CLINIC_PATIENTS[0].data,
  toAccount: (data) => ({
    ...data,
    languageLabel:
      data.preferredLanguage === "en"
        ? ""
        : labelOf([...PATIENT_LANGUAGES], data.preferredLanguage),
    healthPlanLabel:
      HEALTH_PLANS.find((plan) => plan.id === data.healthPlanOnFile)?.name ?? "",
  }),
};
