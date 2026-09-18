import type { SchemaDefinition, SurveyJSON } from "./types";

/**
 * Plan finder — the form the embedded demo puts in its host site's hero.
 *
 * A survey that earns its place on a marketing page: it works out which of the
 * host's four plans and three add-on modules fit, prices the result, and collects
 * what the visitor wishes the product did.
 *
 * The pricing it reasons about is the same one the mock site's Pricing and Suite
 * sections advertise (`CadenceSite.tsx`), and the tiers are arranged so the
 * recommendation is never worse value than the alternative: two or more modules
 * cost more on Team ($12 + $4/$6/$5 each) than Business does flat ($19), so
 * `recommendedPlan` moves to Business at exactly that point.
 *
 * Demonstrates the parts of SurveyJS a product form actually needs, rather than
 * a questionnaire: `calculatedValues` deriving the plan, the module set and the
 * price from the answers, an `expression` question showing that price live,
 * `visibleIf` branching down to individual summary lines, a priority matrix, a
 * `ranking` question, and the result piped into the completion page.
 */
export const planFinderJson: SurveyJSON = {
  title: "Find the right plan",
  description:
    "Four short steps. You get a plan, the modules that fit, and a price; we get to hear what to build next.",
  showQuestionNumbers: "off",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  showProgressBar: true,
  progressBarLocation: "belowheader",
  progressBarType: "pages",
  progressBarShowPageTitles: true,
  progressBarShowPageNumbers: true,
  progressBarNavigationTextLocation: "bottom",
  completeText: "See my plan",
  calculatedValues: [
    {
      name: "moduleCount",
      expression:
        "iif({modules.capacity} = 2, 1, 0) + iif({modules.portfolio} = 2, 1, 0) + iif({modules.insights} = 2, 1, 0)",
      includeIntoResult: true,
    },
    {
      name: "moduleCost",
      expression:
        "iif({modules.capacity} = 2, 4, 0) + iif({modules.portfolio} = 2, 6, 0) + iif({modules.insights} = 2, 5, 0)",
      includeIntoResult: true,
    },
    {
      name: "recommendedPlan",
      expression:
        "iif({selfHosted} = true or {teamSize} >= 101, 'Enterprise', iif({ssoRequired} = true or {moduleCount} >= 2, 'Business', iif({teamSize} <= 5 and {moduleCount} = 0, 'Starter', 'Team')))",
      includeIntoResult: true,
    },
    {
      name: "seatPrice",
      expression:
        "iif({recommendedPlan} = 'Business', 19, iif({recommendedPlan} = 'Team', 12 + {moduleCost}, 0))",
      includeIntoResult: true,
    },
    {
      name: "monthlyEstimate",
      expression: "{seatPrice} * {teamSize}",
      includeIntoResult: true,
    },
  ],
  pages: [
    {
      name: "team",
      title: "Your team",
      elements: [
        {
          type: "dropdown",
          name: "role",
          title: "What best describes you?",
          isRequired: true,
          requiredErrorText: "Pick the closest match.",
          choices: [
            "Engineering lead",
            "Product manager",
            "Operations",
            "Agency or consultancy",
            "Founder",
          ],
        },
        {
          type: "dropdown",
          name: "teamSize",
          title: "How many people will plan in it?",
          isRequired: true,
          choices: [
            { value: 3, text: "Up to 5" },
            { value: 15, text: "6 to 20" },
            { value: 50, text: "21 to 100" },
            { value: 250, text: "More than 100" },
          ],
        },
        {
          type: "radiogroup",
          name: "planningToday",
          title: "How do you plan today?",
          choices: [
            "Spreadsheets",
            "Jira or Linear",
            "Another planning tool",
            "Nothing formal yet",
          ],
        },
      ],
    },
    {
      // Not `modules`: the matrix below is called that, and an element name must
      // be unique across pages, panels and questions alike — the linter reports
      // the clash as `name/duplicate`, and the write route refuses the save. The
      // matrix keeps the name, because that is the key every answer is stored
      // under and every expression on this page reads.
      name: "modulesPage",
      title: "Modules",
      elements: [
        {
          type: "html",
          name: "modulesIntro",
          html: "<p>Every plan includes <strong>Plan</strong>, the timeline and board. The three modules below are switched on per workspace.</p>",
        },
        {
          type: "matrix",
          name: "modules",
          title: "How much do you need each module?",
          columns: [
            { value: 0, text: "Not needed" },
            { value: 1, text: "Nice to have" },
            { value: 2, text: "Must have" },
          ],
          rows: [
            { value: "capacity", text: "Capacity — workload warnings ($4)" },
            { value: "portfolio", text: "Portfolio — cross-project rollups ($6)" },
            { value: "insights", text: "Insights — cycle-time analytics ($5)" },
          ],
        },
        {
          type: "checkbox",
          name: "integrations",
          title: "What should it talk to on day one?",
          colCount: 2,
          choices: ["Slack", "GitHub", "Jira", "Google Calendar", "Zapier"],
          showNoneItem: true,
          noneText: "Nothing yet",
          separateSpecialChoices: true,
        },
      ],
    },
    {
      name: "constraints",
      title: "Constraints",
      elements: [
        {
          type: "boolean",
          name: "ssoRequired",
          title: "Do you need SSO and an audit log?",
          labelTrue: "Yes",
          labelFalse: "Not yet",
        },
        {
          type: "boolean",
          name: "selfHosted",
          title: "Does it have to run inside your own VPC?",
          labelTrue: "Yes",
          labelFalse: "No, hosted is fine",
        },
        {
          type: "dropdown",
          name: "startWhen",
          title: "When would you want to start?",
          choices: ["This week", "This month", "This quarter", "Just exploring"],
        },
        {
          type: "expression",
          name: "estimate",
          title: "Your estimate so far",
          description: "Per month, billed monthly. Cancel whenever.",
          expression: "{monthlyEstimate}",
          displayStyle: "currency",
          currency: "USD",
          visibleIf: "{recommendedPlan} = 'Team' or {recommendedPlan} = 'Business'",
        },
        {
          type: "html",
          name: "estimateStarter",
          visibleIf: "{recommendedPlan} = 'Starter'",
          html: "<p>Everything you have asked for so far fits the free Starter plan. No estimate needed.</p>",
        },
        {
          type: "html",
          name: "estimateEnterprise",
          visibleIf: "{recommendedPlan} = 'Enterprise'",
          html: "<p>Self-hosting and teams past a hundred people are quoted annually — we will come back with a number rather than guess one here.</p>",
        },
      ],
    },
    {
      name: "wishes",
      title: "Wishes",
      elements: [
        {
          type: "html",
          name: "recommendation",
          visibleIf: "{recommendedPlan} notempty",
          html: "<p>We would start you on the <strong>{recommendedPlan}</strong> plan.</p>",
        },
        {
          type: "panel",
          name: "modulesSummary",
          title: "Modules we would switch on",
          elements: [
            {
              type: "html",
              name: "moduleCore",
              html: "<p><strong>Plan</strong> — the timeline and board, included in every tier.</p>",
            },
            {
              type: "html",
              name: "moduleCapacity",
              visibleIf: "{modules.capacity} = 2",
              html: "<p><strong>Capacity</strong> — workload warnings before the week is overcommitted.</p>",
            },
            {
              type: "html",
              name: "modulePortfolio",
              visibleIf: "{modules.portfolio} = 2",
              html: "<p><strong>Portfolio</strong> — rollups across every project in one view.</p>",
            },
            {
              type: "html",
              name: "moduleInsights",
              visibleIf: "{modules.insights} = 2",
              html: "<p><strong>Insights</strong> — cycle time and throughput, without a spreadsheet.</p>",
            },
            {
              type: "html",
              name: "moduleNone",
              visibleIf: "{moduleCount} = 0",
              html: "<p>Just the core for now. Modules can be switched on later without a migration.</p>",
            },
            {
              type: "html",
              name: "moduleIncluded",
              visibleIf: "{recommendedPlan} = 'Business' and {moduleCount} > 0",
              html: "<p>On Business all three modules are included, so the two you marked as must-haves cost nothing extra.</p>",
            },
          ],
        },
        {
          type: "ranking",
          name: "roadmapWishes",
          title: "What should we build first?",
          description: "Drag the one that would matter most to the top.",
          choices: [
            "A native mobile app",
            "Deeper Jira sync",
            "Time tracking",
            "A public API and webhooks",
            "Custom fields",
            "Offline mode",
          ],
        },
        {
          type: "comment",
          name: "anythingElse",
          title: "Anything the list above is missing?",
          placeholder: "The one thing that would make you switch…",
          rows: 3,
        },
        {
          type: "boolean",
          name: "emailMe",
          title: "Should we email you this recommendation?",
          labelTrue: "Yes, please",
          labelFalse: "No, thanks",
        },
        {
          type: "text",
          name: "contactEmail",
          title: "Where should we send it?",
          inputType: "email",
          placeholder: "you@company.com",
          visibleIf: "{emailMe} = true",
          isRequired: true,
          requiredIf: "{emailMe} = true",
          validators: [{ type: "email" }],
        },
      ],
    },
  ],
  completedHtml:
    "<h4>Your plan: {recommendedPlan}</h4><p>Your top priority is on its way to the roadmap, and the set-up you described is waiting whenever you want to start.</p>",
};

export const planFinderSchema: SchemaDefinition = {
  id: "plan-finder",
  title: "Plan Finder",
  description:
    "Works out which plan and which add-on modules fit, prices them, and collects what to build next.",
  json: planFinderJson,
};
