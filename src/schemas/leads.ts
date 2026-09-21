import type { SchemaDefinition, SurveyJSON } from "./types";

/**
 * The people a lead can be owned by. The `owner` dropdown's choices, and the
 * list's Owner column, both come from here.
 */
// TODO(choices-from-api): owners come from `/api/users` once the choices load
// from the server; until then this static list is the source for both.
export const LEAD_OWNERS = [
  { id: "owen.mercer", name: "Owen Mercer" },
  { id: "ines.moreau", name: "Ines Moreau" },
  { id: "callum.reid", name: "Callum Reid" },
  { id: "leila.haddad", name: "Leila Haddad" },
] as const;

/** Two decimals, no currency symbol: the record's own currency is in the title. */
const MONEY = {
  displayStyle: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

/**
 * A CRM opportunity: the account and its people, the deal and its line items,
 * and where qualification stands.
 *
 * Written for the multi-user editing that comes next, so a few rules hold
 * everywhere:
 *
 *  - every dynamic panel and matrix carries a hidden `id`, assigned by storage on
 *    save (`assignRowIds`), so a remote change addresses a row, not an index;
 *  - every total is an expression over current values, never accumulated, and
 *    nothing uses `setValueExpression` or a `defaultValueExpression` that reads
 *    another answer — a value arriving from elsewhere never rewrites one;
 *  - `clearInvisibleValues: "none"`, so hiding a question (by role, by stage)
 *    never deletes its answer, and the hidden ids survive a save.
 *
 * The signed-in user arrives as the `user` variable: `{user_role}` gates the
 * budget amount and the discount rule.
 */
export const leadsJson: SurveyJSON = {
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  clearInvisibleValues: "none",
  showProgressBar: true,
  progressBarType: "pages",
  progressBarShowPageTitles: true,
  calculatedValues: [
    {
      // New 10, Qualified 25, Proposal 50, Negotiation 75, Closed won 100;
      // Closed lost and a blank stage 0.
      name: "stageProbability",
      expression:
        "iif({stage} = 'qualified', 25, iif({stage} = 'proposal', 50, iif({stage} = 'negotiation', 75, iif({stage} = 'closedWon', 100, iif({stage} = 'new', 10, 0)))))",
    },
  ],
  pages: [
    {
      name: "accountPage",
      title: "Account and people",
      // The progress bar's label; the page heading keeps the full title.
      navigationTitle: "Account",
      elements: [
        { type: "text", name: "accountName", title: "Account", isRequired: true },
        {
          type: "text",
          name: "website",
          title: "Website",
          inputType: "url",
          startWithNewLine: false,
        },
        {
          type: "dropdown",
          name: "industry",
          title: "Industry",
          choices: [
            { value: "software", text: "Software" },
            { value: "healthcare", text: "Healthcare" },
            { value: "logistics", text: "Logistics" },
            { value: "manufacturing", text: "Manufacturing" },
            { value: "publicSector", text: "Public sector" },
            { value: "education", text: "Education" },
            { value: "other", text: "Other" },
          ],
        },
        {
          type: "dropdown",
          name: "employees",
          title: "Employees",
          startWithNewLine: false,
          choices: [
            { value: "size1to50", text: "1–50" },
            { value: "size51to200", text: "51–200" },
            { value: "size201to1000", text: "201–1,000" },
            { value: "size1000plus", text: "1,000+" },
          ],
        },
        {
          type: "dropdown",
          name: "country",
          title: "Country",
          startWithNewLine: false,
          choices: [
            { value: "us", text: "United States" },
            { value: "ca", text: "Canada" },
            { value: "gb", text: "United Kingdom" },
            { value: "de", text: "Germany" },
            { value: "nl", text: "Netherlands" },
            { value: "fr", text: "France" },
            { value: "au", text: "Australia" },
          ],
        },
        { type: "comment", name: "accountNotes", title: "Account notes", rows: 2 },
        {
          type: "paneldynamic",
          name: "contacts",
          title: "Contacts",
          templateTitle: "{panel.fullName}",
          panelsState: "collapsed",
          minPanelCount: 1,
          maxPanelCount: 6,
          addPanelText: "Add a contact",
          templateElements: [
            { type: "text", name: "id", visible: false },
            { type: "text", name: "fullName", title: "Full name", isRequired: true },
            { type: "text", name: "jobTitle", title: "Job title", startWithNewLine: false },
            {
              type: "text",
              name: "email",
              title: "Email",
              inputType: "email",
              // TODO(async-validator): add the `emailExists()` server check here,
              // warning when the address already belongs to a contact elsewhere.
              validators: [{ type: "email" }],
            },
            {
              type: "text",
              name: "phone",
              title: "Phone",
              inputType: "tel",
              startWithNewLine: false,
            },
            {
              type: "dropdown",
              name: "role",
              title: "Role in the deal",
              choices: [
                { value: "economicBuyer", text: "Economic buyer" },
                { value: "champion", text: "Champion" },
                { value: "technicalEvaluator", text: "Technical evaluator" },
                { value: "procurement", text: "Procurement" },
                { value: "endUser", text: "End user" },
              ],
            },
            {
              type: "rating",
              name: "influence",
              title: "Influence",
              startWithNewLine: false,
            },
            { type: "comment", name: "notes", title: "Notes", rows: 2 },
          ],
        },
        {
          type: "html",
          name: "economicBuyerWarning",
          visibleIf:
            // The filter is the third argument: an expression over one contact's
            // fields, passed as a string. The value inside it is a bare word,
            // because the parser has no second quote character to nest
            // `'economicBuyer'` in, and a bare `{role}` outside a string would
            // read as a question named `role`.
            "countInArray({contacts}, 'fullName') > 0 and countInArray({contacts}, 'fullName', '{role} = economicBuyer') = 0",
          html: "<p><strong>No economic buyer on this deal yet.</strong> Deals without one stall at procurement.</p>",
        },
      ],
    },
    {
      name: "opportunityPage",
      title: "Opportunity",
      elements: [
        {
          type: "dropdown",
          name: "stage",
          title: "Stage",
          choices: [
            { value: "new", text: "New" },
            { value: "qualified", text: "Qualified" },
            { value: "proposal", text: "Proposal" },
            { value: "negotiation", text: "Negotiation" },
            { value: "closedWon", text: "Closed won" },
            { value: "closedLost", text: "Closed lost" },
          ],
        },
        {
          type: "dropdown",
          name: "owner",
          title: "Owner",
          startWithNewLine: false,
          // TODO(choices-from-api): load from `/api/users` (LEAD_OWNERS above).
          choices: LEAD_OWNERS.map((owner) => ({ value: owner.id, text: owner.name })),
        },
        {
          type: "dropdown",
          name: "source",
          title: "Source",
          choices: [
            { value: "inbound", text: "Inbound" },
            { value: "outbound", text: "Outbound" },
            { value: "partner", text: "Partner" },
            { value: "event", text: "Event" },
            { value: "referral", text: "Referral" },
          ],
        },
        {
          type: "text",
          name: "expectedClose",
          title: "Expected close",
          inputType: "date",
          startWithNewLine: false,
        },
        {
          type: "dropdown",
          name: "currency",
          title: "Currency",
          isRequired: true,
          startWithNewLine: false,
          choices: ["USD", "EUR", "GBP"],
        },
        {
          type: "matrixdynamic",
          name: "lineItems",
          title: "Line items",
          addRowText: "Add a product",
          rowCount: 0,
          columns: [
            { name: "id", cellType: "text", visible: false },
            {
              name: "product",
              title: "Product",
              cellType: "dropdown",
              isRequired: true,
              minWidth: "11rem",
              // TODO(choices-from-api): load from `/api/products`, with the list price.
              choices: [
                { value: "platform", text: "Platform licence (per developer)" },
                { value: "ssoAddOn", text: "SSO add-on (per developer)" },
                { value: "premiumSupport", text: "Premium support" },
                { value: "onboarding", text: "Onboarding package" },
              ],
            },
            {
              name: "edition",
              title: "Edition",
              cellType: "dropdown",
              choices: [
                { value: "team", text: "Team" },
                { value: "business", text: "Business" },
                { value: "enterprise", text: "Enterprise" },
              ],
            },
            {
              name: "quantity",
              title: "Qty",
              cellType: "text",
              inputType: "number",
              isRequired: true,
              min: 1,
              defaultValue: 1,
            },
            {
              name: "unitPrice",
              title: "Unit price ({currency})",
              cellType: "text",
              inputType: "number",
              isRequired: true,
              min: 0,
            },
            {
              name: "discountPct",
              title: "Discount %",
              cellType: "text",
              inputType: "number",
              min: 0,
              max: 40,
              defaultValue: 0,
              validators: [
                {
                  type: "expression",
                  expression: "{row.discountPct} <= 20 or {user_role} = 'manager'",
                  text: "Discounts above 20% need a manager.",
                },
              ],
            },
            {
              name: "lineGross",
              cellType: "expression",
              visible: false,
              expression: "round({row.quantity} * {row.unitPrice}, 2)",
            },
            {
              name: "lineTotal",
              title: "Line total ({currency})",
              cellType: "expression",
              ...MONEY,
              expression: "round({row.lineGross} * (1 - {row.discountPct} / 100), 2)",
            },
            {
              name: "lineDiscount",
              cellType: "expression",
              visible: false,
              expression: "round({row.lineGross} - {row.lineTotal}, 2)",
            },
          ],
        },
        {
          type: "expression",
          name: "subtotal",
          title: "Subtotal ({currency})",
          ...MONEY,
          expression: "round({dealValue} + {discountTotal}, 2)",
        },
        {
          type: "expression",
          name: "discountTotal",
          title: "Discounts ({currency})",
          startWithNewLine: false,
          ...MONEY,
          expression: "round(sumInArray({lineItems}, 'lineDiscount'), 2)",
        },
        {
          type: "expression",
          name: "dealValue",
          title: "Deal value ({currency})",
          startWithNewLine: false,
          ...MONEY,
          expression: "round(sumInArray({lineItems}, 'lineTotal'), 2)",
        },
        {
          type: "expression",
          name: "weightedValue",
          title: "Weighted by stage ({currency})",
          startWithNewLine: false,
          ...MONEY,
          expression: "round({dealValue} * {stageProbability} / 100, 2)",
        },
        {
          type: "matrixdynamic",
          name: "competitors",
          title: "Competitors",
          addRowText: "Add a competitor",
          rowCount: 0,
          maxRowCount: 4,
          columns: [
            { name: "id", cellType: "text", visible: false },
            {
              name: "vendor",
              title: "Vendor",
              cellType: "dropdown",
              choices: [
                { value: "inHouse", text: "Incumbent in-house solution" },
                { value: "vendorA", text: "Vendor A" },
                { value: "vendorB", text: "Vendor B" },
                { value: "other", text: "Other" },
              ],
            },
            {
              name: "strength",
              title: "Their strength",
              cellType: "dropdown",
              choices: [
                { value: "price", text: "Price" },
                { value: "features", text: "Features" },
                { value: "relationship", text: "Existing relationship" },
                { value: "compliance", text: "Compliance" },
              ],
            },
            { name: "competitorNote", title: "Note", cellType: "text" },
          ],
        },
        {
          type: "dropdown",
          name: "closedLostReason",
          title: "Why it was lost",
          visibleIf: "{stage} = 'closedLost'",
          choices: [
            { value: "price", text: "Price" },
            { value: "features", text: "Missing features" },
            { value: "competitor", text: "Went with a competitor" },
            { value: "noDecision", text: "No decision" },
            { value: "timing", text: "Timing" },
          ],
        },
        {
          type: "comment",
          name: "closedLostNotes",
          title: "What happened",
          visibleIf: "{stage} = 'closedLost'",
          rows: 2,
        },
      ],
    },
    {
      name: "qualificationPage",
      title: "Qualification and next steps",
      navigationTitle: "Qualification",
      elements: [
        {
          type: "panel",
          name: "qualification",
          title: "Qualification",
          elements: [
            { type: "boolean", name: "budgetConfirmed", title: "Budget confirmed" },
            {
              type: "text",
              name: "budgetAmount",
              title: "Budget ({currency})",
              inputType: "number",
              min: 0,
              startWithNewLine: false,
              visibleIf: "{budgetConfirmed} = true and {user_role} = 'manager'",
            },
            {
              type: "boolean",
              name: "authorityIdentified",
              title: "Decision maker identified",
              startWithNewLine: false,
            },
            {
              type: "comment",
              name: "needSummary",
              title: "The need, in their words",
              rows: 2,
              requiredIf: "{stage} anyof ['proposal', 'negotiation', 'closedWon']",
            },
            {
              type: "dropdown",
              name: "timeline",
              title: "Buying timeline",
              choices: [
                { value: "thisQuarter", text: "This quarter" },
                { value: "nextQuarter", text: "Next quarter" },
                { value: "thisYear", text: "This year" },
                { value: "noDate", text: "No date" },
              ],
            },
            {
              type: "expression",
              name: "qualificationScore",
              title: "Qualification score (0–100)",
              startWithNewLine: false,
              expression:
                "iif({budgetConfirmed} = true, 30, 0) + iif({authorityIdentified} = true, 25, 0) + iif({needSummary} notempty, 20, 0) + iif({timeline} = 'thisQuarter', 25, iif({timeline} = 'nextQuarter', 15, iif({timeline} = 'thisYear', 10, 0)))",
            },
            {
              type: "checkbox",
              name: "blockers",
              title: "Blockers",
              colCount: 3,
              showNoneItem: true,
              choices: [
                { value: "securityReview", text: "Security review" },
                { value: "procurement", text: "Procurement" },
                { value: "legal", text: "Legal" },
                { value: "budgetFreeze", text: "Budget freeze" },
                { value: "migrationEffort", text: "Migration effort" },
              ],
            },
          ],
        },
        {
          type: "matrixdynamic",
          name: "securityReview",
          title: "Security review",
          visibleIf: "{blockers} contains 'securityReview'",
          addRowText: "Add a review item",
          rowCount: 0,
          columns: [
            { name: "id", cellType: "text", visible: false },
            {
              name: "item",
              title: "Item",
              cellType: "dropdown",
              choices: [
                { value: "soc2", text: "SOC 2 report" },
                { value: "penTest", text: "Penetration test" },
                { value: "dpa", text: "DPA" },
                { value: "sso", text: "SSO requirement" },
                { value: "dataResidency", text: "Data residency" },
              ],
            },
            {
              name: "status",
              title: "Status",
              cellType: "dropdown",
              choices: [
                { value: "notStarted", text: "Not started" },
                { value: "requested", text: "Requested" },
                { value: "inReview", text: "In review" },
                { value: "approved", text: "Approved" },
              ],
            },
            { name: "dueDate", title: "Due", cellType: "text", inputType: "date" },
            { name: "reviewOwner", title: "Owner", cellType: "text" },
          ],
        },
        {
          // No sorting: rows stay in the order they were added, and a new one
          // lands at the bottom.
          type: "matrixdynamic",
          name: "activities",
          title: "Activities",
          addRowText: "Log an activity",
          rowCount: 0,
          columns: [
            { name: "id", cellType: "text", visible: false },
            { name: "activityDate", title: "Date", cellType: "text", inputType: "date" },
            {
              name: "activityType",
              title: "Type",
              cellType: "dropdown",
              choices: [
                { value: "call", text: "Call" },
                { value: "email", text: "Email" },
                { value: "meeting", text: "Meeting" },
                { value: "demo", text: "Demo" },
                { value: "proposalSent", text: "Proposal sent" },
              ],
            },
            { name: "who", title: "Who", cellType: "text" },
            { name: "summary", title: "Summary", cellType: "text", minWidth: "14rem" },
          ],
        },
        {
          type: "text",
          name: "nextStep",
          title: "Next step",
          requiredIf: "{stage} noneof ['closedWon', 'closedLost']",
        },
        {
          type: "text",
          name: "nextStepDate",
          title: "By",
          inputType: "date",
          startWithNewLine: false,
          requiredIf: "{stage} noneof ['closedWon', 'closedLost']",
        },
      ],
    },
  ],
};

export const leadsSchema: SchemaDefinition = {
  id: "leads",
  title: "Lead record",
  description: "A CRM opportunity: account and contacts, line items with totals, qualification.",
  json: leadsJson,
};
