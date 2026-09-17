import type { ISurveyVariablePresets } from "survey-core";

/** The Cadence plans: the value an account carries, and the text a form shows for it. */
export const CADENCE_PLANS = [
  { value: "free", text: "Free" },
  { value: "business", text: "Business" },
  { value: "enterprise", text: "Enterprise" },
] as const;

/**
 * What the Cadence host app knows about whoever is signed in, and three people
 * to try it with. The feedback form (`customer-satisfaction.ts`) reads these.
 *
 * Three presets, because "Login as" is only an argument if the form comes out
 * differently for each: an established admin with an open ticket, a
 * three-week-old free account that gets an onboarding page instead of the
 * plan-fit question, and an enterprise account with a named CSM whose renewal
 * step nobody else sees. The same JSON in all three cases.
 *
 * Worth changing in front of an audience: the name (the greeting follows),
 * months as a customer down to 1, the plan to Free (the upgrade question
 * instead), the ticket switch (the Support step leaves the progress bar), the
 * CSM name (renewal questions arrive), or clearing the email (the form starts
 * asking for one).
 */
export const cadenceVariablePresets: ISurveyVariablePresets = {
  definition: {
    showQuestionNumbers: "off",
    widthMode: "responsive",
    questionErrorLocation: "bottom",
    showNavigationButtons: "none",
    pages: [
      {
        name: "account",
        elements: [
          { type: "text", name: "user_firstName", title: "First name" },
          { type: "text", name: "user_lastName", title: "Last name", startWithNewLine: false },
          { type: "text", name: "user_email", title: "Email", inputType: "email" },
          { type: "text", name: "user_company", title: "Company" },
          { type: "text", name: "user_role", title: "Role", startWithNewLine: false },
          { type: "dropdown", name: "user_plan", title: "Plan", choices: [...CADENCE_PLANS] },
          {
            type: "text",
            name: "user_seats",
            title: "Seats",
            inputType: "number",
            min: 1,
            startWithNewLine: false,
          },
          {
            type: "text",
            name: "user_monthsActive",
            title: "Months as a customer",
            description: "Under 3 turns the survey into an onboarding one.",
            inputType: "number",
            min: 0,
          },
          {
            type: "text",
            name: "user_csmName",
            title: "Named CSM",
            description: "Blank for accounts that do not have one.",
            startWithNewLine: false,
          },
          {
            type: "boolean",
            name: "user_openTicket",
            title: "Open support ticket?",
            labelTrue: "Yes, one is open",
            labelFalse: "No",
          },
          {
            type: "text",
            name: "user_lastTicketSubject",
            title: "What it is about",
            visibleIf: "{user_openTicket} = true",
          },
        ],
      },
    ],
  },
  presets: [
    {
      name: "Alex Rivera",
      description: "Workspace admin on Business, 14 months in, one open ticket",
      variables: {
        user_firstName: "Alex",
        user_lastName: "Rivera",
        user_email: "alex.rivera@northwind.example",
        user_company: "Northwind Labs",
        user_role: "Workspace admin",
        user_plan: "business",
        user_seats: 42,
        user_monthsActive: 14,
        user_openTicket: true,
        user_lastTicketSubject: "SSO group sync",
        user_csmName: "",
      },
    },
    {
      name: "Priya Shah",
      description: "Product designer on Free, 2 months in: the onboarding version",
      variables: {
        user_firstName: "Priya",
        user_lastName: "Shah",
        user_email: "priya.shah@lumenpath.example",
        user_company: "Lumenpath",
        user_role: "Product designer",
        user_plan: "free",
        user_seats: 3,
        user_monthsActive: 2,
        user_openTicket: false,
        user_lastTicketSubject: "",
        user_csmName: "",
      },
    },
    {
      name: "Tomás Herrera",
      description: "Director of operations on Enterprise, 480 seats, a named CSM",
      variables: {
        user_firstName: "Tomás",
        user_lastName: "Herrera",
        user_email: "t.herrera@meridianfoods.example",
        user_company: "Meridian Foods",
        user_role: "Director of operations",
        user_plan: "enterprise",
        user_seats: 480,
        user_monthsActive: 31,
        user_openTicket: false,
        user_lastTicketSubject: "",
        user_csmName: "Dana Whitfield",
      },
    },
  ],
};
