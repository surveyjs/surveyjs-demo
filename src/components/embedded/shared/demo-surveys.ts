import {
  clinicVisitSample,
  customerSatisfactionSample,
  encounterNoteSample,
  getSchemaDefinition,
} from "@/schemas";
import type { DemoSurvey } from "./demo-controls";

/**
 * The definition each embedded demo carries, described once.
 *
 * One per demo, on purpose: three host sites are already three different stories,
 * and a switcher inside each of them only invites the question of which one is
 * the real product.
 */
export const DEMO_SURVEYS: Record<string, DemoSurvey> = {
  satisfaction: {
    id: "customer-satisfaction",
    label: "Satisfaction survey",
    hint: "The classic CSAT, addressed to the account that is signed in.",
    json: getSchemaDefinition("customer-satisfaction").json,
    prefill: customerSatisfactionSample,
  },
  encounterNote: {
    id: "encounter-note",
    label: "Encounter note",
    hint: "The whole clinician workspace: eight pages, totals, scores and a signature.",
    json: getSchemaDefinition("encounter-note").json,
    prefill: encounterNoteSample,
  },
  clinicVisit: {
    id: "clinic-visit",
    label: "Appointment request",
    hint: "Arrives filled in from the patient's chart — in the language the chart asks for.",
    json: getSchemaDefinition("clinic-visit").json,
    prefill: clinicVisitSample,
  },
};
