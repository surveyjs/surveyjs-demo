import type { ISurveyVariablePresets } from "survey-core";
import { LEAD_OWNERS } from "../leads";
import type { SessionUser } from "../types";
import { toVariables } from "./prefix";

function owner(id: (typeof LEAD_OWNERS)[number]["id"]): { id: string; name: string } {
  const found = LEAD_OWNERS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown lead owner: ${id}`);
  return { id: found.id, name: found.name };
}

/**
 * The users who may sign in to Leads, first one signed in. Both are owners in
 * the `owner` dropdown. `role` gates the budget amount and the discount rule in
 * the definition; `currency` is what a new lead they create starts in.
 *
 * One list, read twice: `src/storage/session.ts` serves it as the page's session
 * users, and the presets below are the same people as variables.
 */
export const LEADS_USERS: readonly SessionUser[] = [
  { ...owner("owen.mercer"), role: "sales", currency: "USD" },
  { ...owner("ines.moreau"), role: "manager", currency: "EUR" },
];

const DESCRIPTIONS: Readonly<Record<string, string>> = {
  "owen.mercer": "Sales rep, new leads start in USD",
  "ines.moreau": "Manager, new leads start in EUR: sees the budget and may approve discounts",
};

/** What Leads knows about whoever is signed in. `leads.ts` reads `{user_role}`. */
export const leadsVariablePresets: ISurveyVariablePresets = {
  definition: {
    showQuestionNumbers: "off",
    elements: [
      { type: "text", name: "user_id", title: "User id", readOnly: true },
      { type: "text", name: "user_name", title: "Name" },
      { type: "dropdown", name: "user_role", title: "Role", choices: ["sales", "manager"] },
      { type: "dropdown", name: "user_currency", title: "Currency", choices: ["USD", "EUR"] },
    ],
  },
  presets: LEADS_USERS.map((user) => ({
    name: user.name,
    description: DESCRIPTIONS[user.id],
    variables: toVariables(user),
  })),
};
