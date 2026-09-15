import type { SurveyResult } from "../types";

/**
 * Six opportunities, shaped to match `leadsJson`, deliberately unalike: a young
 * record, a deal in negotiation, one won, one lost.
 *
 * Price list, per developer per year unless flat; a GBP or EUR deal uses the
 * same numbers in its own currency:
 *
 *   Platform licence   Team 450 · Business 900 · Enterprise 1,600
 *   SSO add-on         120
 *   Premium support    4,000 flat
 *   Onboarding package 2,500 flat
 *
 * No totals are stored: line totals, deal value, weighted value and the
 * qualification score are expressions in the definition, and the list's deal
 * value is recomputed from `lineItems` by the collection. Every panel and row
 * carries the id storage would have assigned on its first save.
 *
 * Dates are 2026. The rows of each matrix are written in the order they were
 * logged, oldest first, because a matrix keeps the order rows were added in.
 */
export const leadsSeed: SurveyResult[] = [
  {
    id: "LEAD-0001",
    data: {
      accountName: "Northwind Labs",
      website: "https://northwind-labs.example",
      industry: "software",
      employees: "size201to1000",
      country: "us",
      accountNotes: "Platform team of 60 moving off a homegrown form builder. Security team signs off every vendor.",
      contacts: [
        {
          id: "b985e479-bb44-413e-b938-9fa765b46f60",
          fullName: "Victor Alvarez",
          jobTitle: "VP Engineering",
          email: "victor.alvarez@northwind-labs.example",
          phone: "+1 415 555 0142",
          role: "economicBuyer",
          influence: 5,
        },
        {
          id: "a554f921-0282-4d96-9aec-42ba889dc5f4",
          fullName: "Rachel Kim",
          jobTitle: "Staff engineer, platform",
          email: "rachel.kim@northwind-labs.example",
          role: "champion",
          influence: 4,
          notes: "Built the current tool and wants out of maintaining it.",
        },
        {
          id: "19bcf6bf-ad35-4ee4-950e-96d7dba7b626",
          fullName: "Mei Tanaka",
          jobTitle: "Security lead",
          email: "mei.tanaka@northwind-labs.example",
          role: "technicalEvaluator",
          influence: 4,
        },
      ],
      stage: "proposal",
      owner: "owen.mercer",
      source: "inbound",
      expectedClose: "2026-10-30",
      currency: "USD",
      lineItems: [
        { id: "814f664f-51f7-428f-86b0-d736fff35e38", product: "platform", edition: "business", quantity: 60, unitPrice: 900, discountPct: 10 },
        { id: "258f8a41-7e75-4349-9e76-57bac8233d6e", product: "ssoAddOn", quantity: 60, unitPrice: 120, discountPct: 0 },
        { id: "1738a896-fe66-4d85-9fb6-6425dfa5fd88", product: "premiumSupport", quantity: 1, unitPrice: 4000, discountPct: 0 },
      ],
      competitors: [
        { id: "1039f618-8a42-456b-bf5c-e746faff2aae", vendor: "vendorA", strength: "features", competitorNote: "Rachel trialled it last year; liked the builder, hated the pricing tiers." },
      ],
      budgetConfirmed: true,
      budgetAmount: 70000,
      authorityIdentified: true,
      needSummary: "Sixty engineers maintain forms by hand in a homegrown tool; they want JSON forms their product teams can edit.",
      timeline: "nextQuarter",
      blockers: ["securityReview", "procurement"],
      securityReview: [
        { id: "0d6f5483-7c67-4877-abf1-28bcee4d0286", item: "soc2", status: "approved", dueDate: "2026-08-21", reviewOwner: "Mei Tanaka" },
        { id: "3b44d86b-5481-4ee9-9fa5-6c48462be0a5", item: "penTest", status: "inReview", dueDate: "2026-09-25", reviewOwner: "Mei Tanaka" },
        { id: "f2cc61d9-570a-42cb-84ee-6cc8d0a39216", item: "dpa", status: "requested", dueDate: "2026-10-02", reviewOwner: "Legal" },
      ],
      activities: [
        { id: "dabe9edd-386a-4427-905c-03b1a2bf4cd1", activityDate: "2026-07-08", activityType: "call", who: "Rachel Kim", summary: "Intro call. Homegrown builder is eating a sprint a quarter." },
        { id: "1b727c58-8db6-474b-bb06-cbb5bc6d9671", activityDate: "2026-07-22", activityType: "demo", who: "Rachel Kim, Mei Tanaka", summary: "Demo went well. Mei wants SOC 2 and a pen test before anything else." },
        { id: "fff6f0a9-8c33-4601-816f-0231402989ab", activityDate: "2026-08-05", activityType: "meeting", who: "Victor Alvarez", summary: "Victor confirmed budget for 60 seats, wants it live in Q4." },
        { id: "08936782-64c8-4883-9f61-56ce1ba52118", activityDate: "2026-08-19", activityType: "email", who: "Mei Tanaka", summary: "Sent SOC 2 report and pen-test summary." },
        { id: "62347270-dc55-449f-b8f2-e3d3f04b466c", activityDate: "2026-09-02", activityType: "proposalSent", who: "Victor Alvarez", summary: "Proposal out: Business, 60 seats, 10% off, SSO and support." },
      ],
      nextStep: "Walk Mei through the pen-test findings",
      nextStepDate: "2026-09-18",
    },
  },
  {
    id: "LEAD-0002",
    data: {
      accountName: "Halcyon Foods",
      website: "https://halcyon-foods.example",
      industry: "manufacturing",
      employees: "size51to200",
      country: "gb",
      accountNotes: "Two plants in the Midlands. Quality audits still run on paper checklists.",
      contacts: [
        {
          id: "5c09ce07-130f-4c18-9000-4589c378251e",
          fullName: "Tom Ashby",
          jobTitle: "Head of Quality",
          email: "tom.ashby@halcyon-foods.example",
          phone: "+44 121 496 0873",
          role: "champion",
          influence: 3,
        },
        {
          id: "ccaf6a0d-a295-47c1-9f2b-76381ded8270",
          fullName: "Lucy Brennan",
          jobTitle: "QA coordinator",
          email: "lucy.brennan@halcyon-foods.example",
          role: "endUser",
          influence: 2,
        },
      ],
      stage: "qualified",
      owner: "callum.reid",
      source: "inbound",
      expectedClose: "2026-12-15",
      currency: "GBP",
      lineItems: [
        { id: "1b235250-eb9c-46af-a532-464c67581ac3", product: "platform", edition: "team", quantity: 25, unitPrice: 450, discountPct: 0 },
      ],
      budgetConfirmed: false,
      authorityIdentified: false,
      needSummary: "Replace paper audit checklists at both plants before the next retailer audit.",
      timeline: "thisYear",
      activities: [
        { id: "c6a10d94-5eca-498f-84f5-f781ade62648", activityDate: "2026-08-26", activityType: "call", who: "Tom Ashby", summary: "Came in through the website. Paper audits, two plants, keen." },
        { id: "bcb0d6a5-0bc0-4ab0-b0a2-a62561ecd69a", activityDate: "2026-09-09", activityType: "demo", who: "Tom Ashby, Lucy Brennan", summary: "Demoed an audit checklist on a tablet. Lucy asked about offline." },
      ],
      nextStep: "Ask Tom to introduce whoever signs off spend",
      nextStepDate: "2026-09-22",
    },
  },
  {
    id: "LEAD-0003",
    data: {
      accountName: "Kestrel Freight",
      website: "https://kestrel-freight.example",
      industry: "logistics",
      employees: "size1000plus",
      country: "nl",
      accountNotes: "Rolling out to every depot. Procurement runs a formal tender; legal redlines everything.",
      contacts: [
        {
          id: "57910165-2175-42fe-ad13-1318c32d49a2",
          fullName: "Anouk de Vries",
          jobTitle: "CFO",
          email: "anouk.devries@kestrel-freight.example",
          role: "economicBuyer",
          influence: 5,
        },
        {
          id: "ae4042fb-15bd-4890-89cc-0a8bcd8024cc",
          fullName: "Lars Hoekstra",
          jobTitle: "Operations systems lead",
          email: "lars.hoekstra@kestrel-freight.example",
          phone: "+31 20 555 0199",
          role: "champion",
          influence: 4,
        },
        {
          id: "d120e557-5fa1-4001-a2a0-392746f7d904",
          fullName: "Femke Bakker",
          jobTitle: "Procurement manager",
          email: "femke.bakker@kestrel-freight.example",
          role: "procurement",
          influence: 3,
          notes: "Needs three quotes on file and our MSA redlined by the 25th.",
        },
        {
          id: "4cd5abc6-f943-41b7-bbb0-904d5b1f8ebf",
          fullName: "Bram Visser",
          jobTitle: "IT architect",
          email: "bram.visser@kestrel-freight.example",
          role: "technicalEvaluator",
          influence: 3,
        },
      ],
      stage: "negotiation",
      owner: "ines.moreau",
      source: "partner",
      expectedClose: "2026-09-30",
      currency: "EUR",
      lineItems: [
        { id: "c546ed7a-30b7-400c-a7c0-968a39fec6cc", product: "platform", edition: "enterprise", quantity: 120, unitPrice: 1600, discountPct: 25 },
        { id: "9b1a9bd8-c5bd-4c17-a906-d5697701e72e", product: "ssoAddOn", quantity: 120, unitPrice: 120, discountPct: 15 },
        { id: "6fc61d41-d158-4748-aa9a-f7397a9fa475", product: "premiumSupport", quantity: 1, unitPrice: 4000, discountPct: 10 },
        { id: "f3738654-412f-43a9-87f5-92ca94e2756f", product: "onboarding", quantity: 1, unitPrice: 2500, discountPct: 0 },
      ],
      competitors: [
        { id: "89b1ca2e-0ff7-4e4b-84b3-76d54878373d", vendor: "inHouse", strength: "relationship", competitorNote: "Depot app built by their own IT team." },
        { id: "356d91df-5b4f-4ce3-855f-c0a6df55972b", vendor: "vendorB", strength: "price", competitorNote: "Came in about 20% under on the tender." },
      ],
      budgetConfirmed: true,
      budgetAmount: 175000,
      authorityIdentified: true,
      needSummary: "One inspection form for 40 depots, feeding their own warehouse system instead of spreadsheets.",
      timeline: "thisQuarter",
      blockers: ["procurement", "legal"],
      activities: [
        { id: "13258712-2cf2-4b4b-9f52-eed4ad0180fe", activityDate: "2026-06-11", activityType: "meeting", who: "Lars Hoekstra", summary: "Partner intro. Depot inspections are a spreadsheet per site." },
        { id: "198f3281-c982-4659-a1e8-d5f526c95e3b", activityDate: "2026-06-30", activityType: "demo", who: "Lars Hoekstra, Bram Visser", summary: "Bram happy with SSO and the API. Wants Enterprise for audit logs." },
        { id: "1269a238-78e7-40c9-bf8e-9af91e5f538e", activityDate: "2026-07-24", activityType: "proposalSent", who: "Anouk de Vries", summary: "Proposal for 120 seats, Enterprise, support and onboarding." },
        { id: "885c14a0-3fc9-4910-89db-4a411e4cda7d", activityDate: "2026-08-20", activityType: "call", who: "Femke Bakker", summary: "Tender opened. Vendor B undercut us; Anouk approved 25% off platform." },
        { id: "5fc8e42f-389f-47e6-94cd-506feab2e9ea", activityDate: "2026-09-08", activityType: "email", who: "Femke Bakker", summary: "Sent revised quote. MSA redlines due back from legal." },
      ],
      nextStep: "Send the redlined MSA back to Femke",
      nextStepDate: "2026-09-16",
    },
  },
  {
    id: "LEAD-0004",
    data: {
      accountName: "Bluepeak Energy",
      industry: "other",
      country: "us",
      contacts: [
        {
          id: "ab65d194-46dc-4b1d-96d5-7dbc1a82829d",
          fullName: "Sam Whitaker",
          jobTitle: "IT manager",
          email: "sam.whitaker@bluepeak-energy.example",
        },
      ],
      stage: "new",
      owner: "leila.haddad",
      source: "event",
      currency: "USD",
      activities: [
        { id: "3fd8beec-ccae-4b25-8632-dcfd1a4441a4", activityDate: "2026-09-10", activityType: "email", who: "Sam Whitaker", summary: "Met at the utilities expo booth. Asked for pricing." },
      ],
      nextStep: "Book a discovery call",
      nextStepDate: "2026-09-21",
    },
  },
  {
    id: "LEAD-0005",
    data: {
      accountName: "Ridgeline Family Health",
      website: "https://ridgeline-family-health.example",
      industry: "healthcare",
      employees: "size201to1000",
      country: "us",
      accountNotes: "Six clinics. Patient intake and appointment requests move onto their own site.",
      contacts: [
        {
          id: "6e079a31-54dc-4e02-b4c7-45c395332c27",
          fullName: "Karen Liu",
          jobTitle: "Chief operating officer",
          email: "karen.liu@ridgeline-family-health.example",
          role: "economicBuyer",
          influence: 5,
        },
        {
          id: "fc795910-c155-45d2-90d0-2210b267150c",
          fullName: "Devon Hale",
          jobTitle: "Practice systems lead",
          email: "devon.hale@ridgeline-family-health.example",
          phone: "+1 503 555 0117",
          role: "champion",
          influence: 4,
        },
        {
          id: "cfa7808b-0132-4ba5-9f1a-d27e24a6654a",
          fullName: "Nina Park",
          jobTitle: "Security and privacy officer",
          email: "nina.park@ridgeline-family-health.example",
          role: "technicalEvaluator",
          influence: 4,
        },
      ],
      stage: "closedWon",
      owner: "owen.mercer",
      source: "referral",
      expectedClose: "2026-08-28",
      currency: "USD",
      lineItems: [
        { id: "f1f73ad3-a923-46fc-8d85-7de92dbabed4", product: "platform", edition: "business", quantity: 40, unitPrice: 900, discountPct: 15 },
        { id: "c1c8f64e-a5b0-4c83-9918-ba15933f091d", product: "ssoAddOn", quantity: 40, unitPrice: 120, discountPct: 0 },
        { id: "c72675f5-adae-4418-a22f-0e8542ded4ad", product: "onboarding", quantity: 1, unitPrice: 2500, discountPct: 0 },
      ],
      competitors: [
        { id: "8fb83b60-bdba-482e-947b-367d8e11fa38", vendor: "vendorA", strength: "features", competitorNote: "Shortlisted, dropped over data residency." },
      ],
      budgetConfirmed: true,
      budgetAmount: 45000,
      authorityIdentified: true,
      needSummary: "Intake and appointment forms their own staff can change, with data kept in the US.",
      timeline: "thisQuarter",
      blockers: ["securityReview"],
      securityReview: [
        { id: "fa78a782-ebac-421f-bad6-fe7b078fbc72", item: "soc2", status: "approved", dueDate: "2026-07-17", reviewOwner: "Nina Park" },
        { id: "4caa6760-e7b2-49d7-bd91-eb11512aaf28", item: "dpa", status: "approved", dueDate: "2026-08-07", reviewOwner: "Nina Park" },
        { id: "308f8ca0-99c9-4e50-8e45-564755da3e66", item: "dataResidency", status: "approved", dueDate: "2026-08-14", reviewOwner: "Nina Park" },
      ],
      activities: [
        { id: "da5d6b09-8e52-4c58-ac78-654e62c73897", activityDate: "2026-06-16", activityType: "call", who: "Devon Hale", summary: "Referral from a partner clinic. Intake is a PDF they email around." },
        { id: "9f137a62-d278-4345-a60f-e31a41ff7823", activityDate: "2026-07-01", activityType: "demo", who: "Devon Hale, Nina Park", summary: "Nina's only question: where does patient data live." },
        { id: "fe0e3705-cc42-4ea0-ab97-ab78a6561570", activityDate: "2026-07-29", activityType: "proposalSent", who: "Karen Liu", summary: "Proposal for 40 seats, Business, 15% off for a two-year term." },
        { id: "ffdd1f69-13ca-4bea-9346-1bebac918b7a", activityDate: "2026-08-28", activityType: "meeting", who: "Karen Liu", summary: "Signed. Onboarding kicks off after Labor Day." },
      ],
    },
  },
  {
    id: "LEAD-0006",
    data: {
      accountName: "Ashgrove District Schools",
      website: "https://ashgrove-schools.example",
      industry: "education",
      employees: "size1000plus",
      country: "us",
      accountNotes: "Public tender; the board votes on anything over $50k.",
      contacts: [
        {
          id: "f97c3ab2-1d3e-4967-bee2-ce1c210e960e",
          fullName: "Robert Haines",
          jobTitle: "Superintendent",
          email: "robert.haines@ashgrove-schools.example",
          role: "economicBuyer",
          influence: 5,
        },
        {
          id: "40abd175-8c99-4593-8884-5e5fd596e2f4",
          fullName: "Julia Marsh",
          jobTitle: "Director of IT",
          email: "julia.marsh@ashgrove-schools.example",
          role: "technicalEvaluator",
          influence: 4,
        },
      ],
      stage: "closedLost",
      owner: "callum.reid",
      source: "outbound",
      expectedClose: "2026-06-30",
      currency: "USD",
      lineItems: [
        { id: "3eb2a08f-ed47-4b62-aba0-60db62337667", product: "platform", edition: "team", quantity: 200, unitPrice: 450, discountPct: 20 },
      ],
      competitors: [
        { id: "9d29f4d7-62e0-46ad-b36e-be37f354c578", vendor: "vendorB", strength: "price", competitorNote: "Won the tender at roughly half our per-seat price." },
        { id: "c56c5cd7-1272-4859-83d5-4c84d0408944", vendor: "inHouse", strength: "relationship", competitorNote: "District IT had been patching Google Forms together." },
      ],
      closedLostReason: "price",
      closedLostNotes: "Board chose Vendor B on price. Julia preferred us; revisit before their 2027 renewal.",
      budgetConfirmed: true,
      budgetAmount: 40000,
      authorityIdentified: true,
      needSummary: "Enrollment and permission-slip forms across 14 schools.",
      timeline: "noDate",
      activities: [
        { id: "94836483-801c-4e4c-8210-2709967fefa2", activityDate: "2026-04-14", activityType: "email", who: "Julia Marsh", summary: "Cold outreach landed. Julia runs forms for 14 schools." },
        { id: "e2a9ffc4-2f8f-4a9b-be1b-9dd5badef461", activityDate: "2026-05-06", activityType: "demo", who: "Julia Marsh", summary: "Good demo. Tender goes to the board in June." },
        { id: "c7512e3e-6fc2-4149-927a-cd53ddc56d79", activityDate: "2026-06-30", activityType: "call", who: "Robert Haines", summary: "Lost on price. Board went with Vendor B." },
      ],
    },
  },
];
