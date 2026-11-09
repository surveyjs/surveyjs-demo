import type { SurveyData } from "../types";

// Owner, currency, stage and row IDs belong to the new record, not this sample.
export const leadsSample: SurveyData = {
  accountName: "Cedar Grove Software",
  website: "https://cedar-grove.example",
  industry: "software",
  employees: "size51to200",
  country: "us",
  accountNotes: "The product team wants customers to configure their own intake forms.",
  contacts: [
    { fullName: "Alex Morgan", jobTitle: "Head of Product", email: "alex.morgan@cedar-grove.example", role: "economicBuyer", influence: 5 },
    { fullName: "Sam Lee", jobTitle: "Lead Engineer", email: "sam.lee@cedar-grove.example", role: "champion", influence: 4 },
  ],
  source: "inbound",
  expectedClose: "2026-12-15",
  lineItems: [
    { product: "platform", edition: "business", quantity: 12, unitPrice: 900, discountPct: 10 },
    { product: "onboarding", quantity: 1, unitPrice: 2500, discountPct: 0 },
  ],
  budgetConfirmed: true,
  budgetAmount: 15000,
  authorityIdentified: true,
  needSummary: "Let customers change intake forms without waiting for a product release.",
  timeline: "nextQuarter",
  nextStep: "Review the integration with the engineering team",
  nextStepDate: "2026-11-12",
};
