import { Model, type Question } from "survey-core";
import type { SurveyData, SurveyJSON } from "@/schemas";

/**
 * The responses the dashboard is drawn from.
 *
 * A dashboard is only convincing on a body of answers, and a template cannot
 * ship real ones — so they are generated here, from the definition itself: walk
 * the questions, and answer each one the way a population would. That keeps the
 * data honest as the forms change (edit a form in the Creator, and the dashboard
 * follows), and it keeps this file small: no 20,000-line fixture.
 *
 * Two properties matter for the charts to look like anything:
 *
 *  - **skew.** Uniform noise draws flat bars, which say nothing. Choices are
 *    weighted so a couple of options lead, ratings lean high the way satisfaction
 *    scores really do, and each form gets its own favourite so no two dashboards
 *    have the same silhouette.
 *  - **determinism.** A seeded generator means the numbers are the same on the
 *    server, in the browser and in a screenshot taken tomorrow.
 *
 * Every response also carries a `timestamp`, which is what the dashboard's date
 * filter works on.
 */

/** mulberry32 — small, seeded, good enough for demo data. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable seed per form id, so the shape of a dashboard never drifts. */
function seedFor(formId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < formId.length; i += 1) {
    hash ^= formId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

interface AnalyticsPreset {
  /** How many responses to draw. Enough for smooth charts, few enough to be instant. */
  readonly responses: number;
  /**
   * Dashboard items, where the automatic pick is worth overriding — an NPS
   * rating wants the NPS visualizer, a region wants a pie.
   */
  readonly items?: readonly (string | Record<string, unknown>)[];
  /**
   * Values no respondent types: `expression` questions and calculated values.
   * The dashboard charts them like any other numeric field, and they are the
   * most interesting numbers a clinical form holds.
   */
  readonly derived?: Readonly<Record<string, readonly [number, number]>>;
  /** What people write in the free-text boxes, for a word cloud worth showing. */
  readonly phrases?: readonly string[];
}

const GENERIC_PHRASES = [
  "Quick and easy to fill in.",
  "The form asked exactly what I expected.",
  "Took longer than it should have.",
  "Clear questions, no jargon.",
  "I could not find where to attach a document.",
  "Everything was already filled in for me, which saved time.",
  "Please keep the shorter version.",
  "The date picker was fiddly on my phone.",
  "Straightforward and fast.",
  "I would prefer fewer steps.",
];

/**
 * One preset per form. Only the parts worth stating are here — everything else
 * the dashboard infers from the definition.
 */
const PRESETS: Record<string, AnalyticsPreset> = {
  "customer-satisfaction": {
    responses: 260,
    items: [
      { name: "overallSatisfaction", type: "bullet" },
      { name: "recommendationScore", type: "nps" },
      "aspectRatings",
      { name: "usagePeriod", type: "pie" },
      "likedFeatures",
      "improvementAreas",
      { name: "planFit", type: "pie" },
      "renewalIntent",
      "additionalFeedback",
    ],
    phrases: [
      "The dashboards are the reason we renewed.",
      "Support answered within the hour.",
      "Pricing is hard to predict as we grow.",
      "Onboarding took a week longer than promised.",
      "The API is the best part of the product.",
      "We would like SSO on the lower tier.",
      "Exports are slow for large workspaces.",
      "Rock solid — no incidents this year.",
      "The mobile app lags behind the web app.",
      "Documentation saved us a support ticket.",
    ],
  },
  "clinic-visit": {
    responses: 180,
    items: [
      { name: "visitReason", type: "pie" },
      "location",
      "provider",
      "preferredDays",
      "preferredTime",
      "chartCondition",
      "symptoms",
    ],
    phrases: [
      "Cough that will not clear after three weeks.",
      "Need a refill before travelling.",
      "Blood pressure has been high at home.",
      "Follow-up on last month's labs.",
      "Rash on both forearms.",
      "Annual physical, nothing new.",
      "Ankle still swollen after a fall.",
      "Would like to discuss sleep problems.",
    ],
  },
  "encounter-note": {
    responses: 150,
    items: [
      { name: "encounterType", type: "pie" },
      "chiefComplaint",
      "painNow",
      { name: "bmi", type: "gauge" },
      { name: "avgSystolic", type: "gauge" },
      { name: "totalMme", type: "bullet" },
      { name: "riskScore", type: "bullet" },
      "rosAbnormal",
      "screeningsDue",
      { name: "tobaccoStatus", type: "pie" },
      "assessmentText",
    ],
    // The numbers the note calculates rather than asks for.
    derived: {
      bmi: [18, 39],
      avgSystolic: [104, 168],
      avgDiastolic: [62, 98],
      totalMme: [0, 120],
      riskScore: [0, 8],
      problemCount: [1, 6],
      phq2Score: [0, 6],
      followUpWeeks: [2, 26],
    },
    phrases: [
      "Poorly controlled asthma, step up the controller.",
      "Stage 2 hypertension, recheck in two weeks.",
      "Type 2 diabetes, A1c trending down.",
      "Mechanical low back pain, no red flags.",
      "Viral upper respiratory infection.",
      "Opioid taper discussed and agreed.",
      "Depression screen positive, referred.",
      "Stable chronic conditions, routine follow-up.",
    ],
  },
  checkout: { responses: 200 },
  "work-order": {
    responses: 240,
    items: [
      { name: "status", type: "pie" },
      { name: "equipmentType", type: "pie" },
      { name: "outcome", type: "pie" },
      { name: "total", type: "histogram" },
      "technicianName",
      "faultReported",
    ],
    // The total is an expression over the parts and the labor, which the
    // generator does not fill in, so its range is stated here instead.
    derived: { total: [85, 2400] },
    phrases: [
      "No cooling, compressor will not start.",
      "Unit tripping the breaker every few hours.",
      "Boiler locking out on flame failure.",
      "Walk-in cooler warm overnight.",
      "Extract fan noisy and slow.",
      "Water leaking from the indoor unit.",
      "Thermostat not responding.",
      "Heat pump stuck in defrost.",
    ],
  },
};

const DEFAULT_PRESET: AnalyticsPreset = { responses: 200 };

export function analyticsPreset(formId: string): AnalyticsPreset {
  return PRESETS[formId] ?? DEFAULT_PRESET;
}

/** The field every response carries, so the date filter has something to filter. */
export const TIMESTAMP_FIELD = "timestamp";

/** ItemValue, narrowed to what generation needs. */
interface ChoiceLike {
  readonly value: unknown;
}

function choicesOf(question: Question): readonly ChoiceLike[] {
  const withChoices = question as unknown as { choices?: readonly ChoiceLike[] };
  return Array.isArray(withChoices.choices) ? withChoices.choices : [];
}

function rowsOf(question: Question): readonly ChoiceLike[] {
  const withRows = question as unknown as { rows?: readonly ChoiceLike[] };
  return Array.isArray(withRows.rows) ? withRows.rows : [];
}

function columnsOf(question: Question): readonly ChoiceLike[] {
  const withColumns = question as unknown as { columns?: readonly ChoiceLike[] };
  return Array.isArray(withColumns.columns) ? withColumns.columns : [];
}

function numberProp(question: Question, key: string, fallback: number): number {
  const value = (question as unknown as Record<string, unknown>)[key];
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Weights that fall off from a rotating favourite.
 *
 * The offset is what stops every question in every form from peaking on its
 * first choice, which is the tell-tale look of generated data.
 */
function weightsFor(count: number, offset: number): number[] {
  return Array.from({ length: count }, (_, index) => {
    const rank = (index + offset) % count;
    return 1 / Math.pow(rank + 1, 0.85);
  });
}

function pickWeighted(
  choices: readonly ChoiceLike[],
  weights: readonly number[],
  random: () => number,
): unknown {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = random() * total;
  for (let index = 0; index < choices.length; index += 1) {
    target -= weights[index];
    if (target <= 0) return choices[index].value;
  }
  return choices[choices.length - 1].value;
}

/** High-leaning integer in [min, max]: the best of two draws, as scores behave. */
function skewedHigh(min: number, max: number, random: () => number): number {
  const span = max - min;
  const draw = Math.max(random(), random());
  return min + Math.round(draw * span);
}

function inRange(
  [min, max]: readonly [number, number],
  random: () => number,
  decimals = 0,
): number {
  const value = min + random() * (max - min);
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * An answer for one question, or `undefined` where a chart would be meaningless
 * — a file upload, a signature, a repeating matrix, somebody's phone number.
 */
function answerFor(
  question: Question,
  offset: number,
  random: () => number,
  phrases: readonly string[],
): unknown {
  const type = question.getType();

  switch (type) {
    case "radiogroup":
    case "dropdown":
    case "imagepicker":
    case "buttongroup": {
      const choices = choicesOf(question);
      if (choices.length === 0) return undefined;
      return pickWeighted(choices, weightsFor(choices.length, offset), random);
    }

    case "checkbox":
    case "tagbox": {
      const choices = choicesOf(question);
      if (choices.length === 0) return undefined;
      const weights = weightsFor(choices.length, offset);
      const wanted = 1 + Math.floor(random() * Math.min(3, choices.length));
      const picked = new Set<unknown>();
      // A handful of draws, deduplicated: the leading choices come up most.
      for (let attempt = 0; attempt < wanted * 3 && picked.size < wanted; attempt += 1) {
        picked.add(pickWeighted(choices, weights, random));
      }
      return [...picked];
    }

    case "boolean":
      return random() < 0.68;

    case "rating": {
      const min = numberProp(question, "rateMin", 1);
      const max = numberProp(question, "rateMax", 5);
      return skewedHigh(min, max, random);
    }

    case "slider": {
      const min = numberProp(question, "min", 0);
      const max = numberProp(question, "max", 100);
      return min + Math.round(random() * (max - min));
    }

    case "matrix": {
      const rows = rowsOf(question);
      const columns = columnsOf(question);
      if (rows.length === 0 || columns.length === 0) return undefined;
      const answers: Record<string, unknown> = {};
      rows.forEach((row, index) => {
        const key = String(row.value);
        answers[key] = pickWeighted(
          columns,
          weightsFor(columns.length, offset + index),
          random,
        );
      });
      return answers;
    }

    case "comment":
      // Not everybody writes something, but enough do to fill a word cloud.
      return random() < 0.8 ? phrases[Math.floor(random() * phrases.length)] : undefined;

    case "text": {
      const inputType = String(
        (question as unknown as Record<string, unknown>).inputType ?? "text",
      );
      if (inputType === "number") {
        const min = numberProp(question, "min", 1);
        const max = numberProp(question, "max", Math.max(min + 10, 100));
        return min + Math.round(random() * (max - min));
      }
      if (inputType === "date") {
        const daysAgo = Math.floor(random() * 90);
        return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
      }
      // Names, emails and phone numbers: nothing to chart, and nothing anyone
      // should see invented in a demo.
      return undefined;
    }

    default:
      return undefined;
  }
}

/**
 * The dataset for one form: `responses` answers, plus a timestamp each.
 *
 * Generated from the definition on the spot — cheap enough (a few hundred rows)
 * that the dashboard page needs no build step, and it never goes stale against a
 * form somebody edited in the Creator.
 */
export function demoResponses(formId: string, json: SurveyJSON): SurveyData[] {
  const preset = analyticsPreset(formId);
  const phrases = preset.phrases ?? GENERIC_PHRASES;
  const random = makeRandom(seedFor(formId));

  const model = new Model(json);
  const questions = model.getAllQuestions();
  const derived = Object.entries(preset.derived ?? {});

  const now = Date.now();

  return Array.from({ length: preset.responses }, (_, index) => {
    const response: SurveyData = {};

    questions.forEach((question, position) => {
      const answer = answerFor(question, index + position, random, phrases);
      if (answer !== undefined) response[question.getValueName()] = answer;
    });

    derived.forEach(([name, range]) => {
      response[name] = inRange(range, random, name === "bmi" ? 1 : 0);
    });

    // Weighted towards the recent end, so a "last 30 days" filter has a story.
    const daysAgo = Math.floor(Math.min(random(), random()) * 90);
    response[TIMESTAMP_FIELD] = new Date(now - daysAgo * 86_400_000).toISOString();

    return response;
  });
}
