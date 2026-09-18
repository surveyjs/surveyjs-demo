import { textFor, type ClinicLocale, type LocalizedText } from "./clinic-locale";
import type { SurveyData } from "./types";

/**
 * Ridgeline Family Health — the locations, clinicians, accepted plans and copays
 * of a fictional US primary-care group, plus the function that turns an
 * appointment request into a visit summary.
 *
 * The point of holding all of it here: the appointment form's dropdowns are
 * generated from these lists, and the visit summary beside the form renders from
 * the same ones. A clinic whose booking form offered a clinician its own summary
 * could not name would be spotted in a second, and that kind of seam is exactly
 * what makes a mock look like a mock.
 *
 * Everything a patient reads is a `LocalizedText`, because the appointment page
 * opens in the language the patient's chart asks for. Translating this file
 * translates the form and the panel at once — they read the same objects. Proper
 * nouns are not translated: clinicians, credentials, offices, addresses and
 * insurance plans keep their names in both languages.
 *
 * Everything below is invented. Nothing here is medical advice, no real practice,
 * clinician, insurer or price is described, and the copay table is illustrative.
 */

export interface ClinicLocation {
  readonly id: string;
  readonly name: string;
  readonly address1: string;
  readonly address2?: string;
  readonly city: string;
  readonly state: string;
  readonly zip: string;
  readonly phone: string;
}

export const CLINIC_LOCATIONS: readonly ClinicLocation[] = [
  {
    id: "cedarpark",
    name: "Cedar Park",
    address1: "1180 Cedar Park Boulevard",
    address2: "Suite 210",
    city: "Portland",
    state: "OR",
    zip: "97214",
    phone: "(503) 555-0148",
  },
  {
    id: "westbridge",
    name: "Westbridge",
    address1: "47 Westbridge Avenue",
    city: "Portland",
    state: "OR",
    zip: "97205",
    phone: "(503) 555-0162",
  },
  {
    id: "marlowe",
    name: "Marlowe Pediatrics",
    address1: "900 Marlowe Street",
    address2: "Suite 3",
    city: "Beaverton",
    state: "OR",
    zip: "97005",
    phone: "(503) 555-0177",
  },
];

export function getLocation(id: string): ClinicLocation | undefined {
  return CLINIC_LOCATIONS.find((location) => location.id === id);
}

export interface Provider {
  readonly id: string;
  readonly name: string;
  readonly credential: string;
  /** What this clinician does, in both languages: it is read by patients. */
  readonly specialty: LocalizedText;
  readonly locationIds: readonly string[];
  readonly acceptingNew: boolean;
  /** Which visit categories this clinician takes. */
  readonly categories: readonly string[];
}

export const PROVIDERS: readonly Provider[] = [
  {
    id: "navarro",
    name: "Alicia Navarro",
    credential: "MD",
    specialty: { default: "Family medicine", es: "Medicina familiar" },
    locationIds: ["cedarpark", "westbridge"],
    acceptingNew: true,
    categories: ["wellness", "illness", "followUp", "vaccination"],
  },
  {
    id: "okonjo",
    name: "Peter Okonjo",
    credential: "MD",
    specialty: { default: "Internal medicine", es: "Medicina interna" },
    locationIds: ["cedarpark"],
    acceptingNew: true,
    categories: ["wellness", "illness", "followUp"],
  },
  {
    id: "weiss",
    name: "Hannah Weiss",
    credential: "DO",
    specialty: { default: "Pediatrics", es: "Pediatría" },
    locationIds: ["marlowe"],
    acceptingNew: true,
    categories: ["wellness", "illness", "vaccination"],
  },
  {
    id: "lindqvist",
    name: "Maya Lindqvist",
    credential: "FNP-C",
    specialty: {
      default: "Family nurse practitioner",
      es: "Enfermería familiar de práctica avanzada",
    },
    locationIds: ["cedarpark", "westbridge", "marlowe"],
    acceptingNew: true,
    categories: ["wellness", "illness", "followUp", "vaccination"],
  },
  {
    id: "reyes",
    name: "Samuel Reyes",
    credential: "MD",
    specialty: { default: "Behavioral health", es: "Salud del comportamiento" },
    locationIds: ["westbridge"],
    acceptingNew: false,
    categories: ["behavioral", "followUp"],
  },
  {
    id: "abara",
    name: "Ruth Abara",
    credential: "PA-C",
    specialty: { default: "Urgent care", es: "Atención urgente" },
    locationIds: ["cedarpark"],
    acceptingNew: true,
    categories: ["illness"],
  },
];

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

/* ── coverage ───────────────────────────────────────────────────────────────── */

export interface HealthPlan {
  readonly id: string;
  readonly name: string;
  readonly copayPrimary: number;
  readonly copaySpecialist: number;
  readonly copayUrgent: number;
  /** HMO plans need a referral from the assigned primary-care clinician. */
  readonly referralRequired: boolean;
}

export const HEALTH_PLANS: readonly HealthPlan[] = [
  {
    id: "meridian",
    name: "Meridian Health PPO",
    copayPrimary: 25,
    copaySpecialist: 45,
    copayUrgent: 60,
    referralRequired: false,
  },
  {
    id: "blueharbor",
    name: "Blue Harbor HMO",
    copayPrimary: 15,
    copaySpecialist: 35,
    copayUrgent: 50,
    referralRequired: true,
  },
  {
    id: "evergreen",
    name: "Evergreen Choice PPO",
    copayPrimary: 30,
    copaySpecialist: 55,
    copayUrgent: 75,
    referralRequired: false,
  },
  {
    id: "statecare",
    name: "StateCare Advantage (Medicare)",
    copayPrimary: 0,
    copaySpecialist: 20,
    copayUrgent: 25,
    referralRequired: false,
  },
  {
    id: "medicaid",
    name: "State Medicaid",
    copayPrimary: 0,
    copaySpecialist: 0,
    copayUrgent: 0,
    referralRequired: true,
  },
];

export function getPlan(id: string): HealthPlan | undefined {
  return HEALTH_PLANS.find((plan) => plan.id === id);
}

/**
 * Transparent self-pay pricing — the thing US patients actually hunt for.
 *
 * One price per visit category, read by `visitSummaryFor` and by nothing else:
 * the page posts the price for the visit being requested, beside the form, so
 * there is no second price table to keep in step with this one.
 */
const SELF_PAY_PRICES = {
  wellness: 229,
  urgent: 189,
  behavioral: 195,
  standard: 149,
} as const;

export interface VisitReason {
  readonly id: string;
  readonly label: LocalizedText;
  /** Which copay column applies. */
  readonly category: "primary" | "specialist" | "urgent";
  readonly providerCategory: string;
}

export const VISIT_REASONS: readonly VisitReason[] = [
  {
    id: "wellness",
    label: {
      default: "Annual physical or wellness visit",
      es: "Examen anual o visita de bienestar",
    },
    category: "primary",
    providerCategory: "wellness",
  },
  {
    id: "illness",
    label: { default: "A new problem or illness", es: "Un problema o una enfermedad nueva" },
    category: "primary",
    providerCategory: "illness",
  },
  {
    id: "followUp",
    label: {
      default: "Follow-up on something we are already treating",
      es: "Seguimiento de algo que ya estamos tratando",
    },
    category: "primary",
    providerCategory: "followUp",
  },
  {
    id: "vaccination",
    label: { default: "Vaccination or travel visit", es: "Vacunas o consulta de viaje" },
    category: "primary",
    providerCategory: "vaccination",
  },
  {
    id: "behavioral",
    label: { default: "Behavioral health", es: "Salud del comportamiento" },
    category: "specialist",
    providerCategory: "behavioral",
  },
  {
    id: "urgentCare",
    label: {
      default: "Urgent — something that will not wait",
      es: "Urgente: algo que no puede esperar",
    },
    category: "urgent",
    providerCategory: "illness",
  },
];

export function getVisitReason(id: string): VisitReason | undefined {
  return VISIT_REASONS.find((reason) => reason.id === id);
}

/**
 * The days a patient can ask for.
 *
 * The **value is the English day name**, in both languages and on purpose: it is
 * what a submitted request carries and what the demo's prefill data holds, so a
 * form answered in Spanish and read back in English says the same thing.
 */
export const PREFERRED_DAYS: readonly { readonly value: string; readonly text: LocalizedText }[] = [
  { value: "Monday", text: { default: "Monday", es: "lunes" } },
  { value: "Tuesday", text: { default: "Tuesday", es: "martes" } },
  { value: "Wednesday", text: { default: "Wednesday", es: "miércoles" } },
  { value: "Thursday", text: { default: "Thursday", es: "jueves" } },
  { value: "Friday", text: { default: "Friday", es: "viernes" } },
  { value: "Saturday", text: { default: "Saturday", es: "sábado" } },
];

export interface PreferredTime {
  readonly value: string;
  readonly label: LocalizedText;
  /**
   * The hours themselves, shown in the summary. Kept apart from the label so
   * nothing has to parse a display string to find them again.
   */
  readonly range?: LocalizedText;
}

export const PREFERRED_TIMES: readonly PreferredTime[] = [
  {
    value: "morning",
    label: { default: "Morning", es: "Mañana" },
    range: { default: "7:30 am – 11:30 am", es: "7:30 a. m. – 11:30 a. m." },
  },
  {
    value: "midday",
    label: { default: "Midday", es: "Mediodía" },
    range: { default: "11:30 am – 2:00 pm", es: "11:30 a. m. – 2:00 p. m." },
  },
  {
    value: "afternoon",
    label: { default: "Afternoon", es: "Tarde" },
    range: { default: "2:00 pm – 6:00 pm", es: "2:00 p. m. – 6:00 p. m." },
  },
  {
    value: "any",
    label: { default: "Any time you have", es: "A cualquier hora que tengan" },
  },
];

/* ── what the chart already knows ───────────────────────────────────────────── */

/**
 * The problem list a returning patient's record can carry.
 *
 * The appointment form asks "is today about something we already treat?" — and
 * the choices it offers are the ones on *this* patient's chart, not all nine.
 * Each choice in the JSON carries `visibleIf: "{conditions} contains 'asthma'"`,
 * so the list is assembled by survey-core from the account, not by us.
 */
export const CHART_CONDITIONS: readonly {
  readonly id: string;
  readonly label: LocalizedText;
}[] = [
  { id: "asthma", label: { default: "Asthma", es: "Asma" } },
  { id: "hypertension", label: { default: "High blood pressure", es: "Presión arterial alta" } },
  { id: "diabetes", label: { default: "Type 2 diabetes", es: "Diabetes tipo 2" } },
  { id: "thyroid", label: { default: "Thyroid condition", es: "Afección de la tiroides" } },
  { id: "migraine", label: { default: "Migraine", es: "Migraña" } },
  { id: "arthritis", label: { default: "Arthritis", es: "Artritis" } },
  { id: "anxiety", label: { default: "Anxiety or depression", es: "Ansiedad o depresión" } },
  { id: "cholesterol", label: { default: "High cholesterol", es: "Colesterol alto" } },
  { id: "gerd", label: { default: "Acid reflux", es: "Reflujo ácido" } },
];

/**
 * The same idea for the medication list, which drives the refill question.
 *
 * The drug and its dose are not translated — they are what is printed on the
 * bottle, and a patient matching a label against a bottle needs them identical.
 * Only the form word around them is ("inhaler" → "inhalador").
 */
export const CHART_MEDICATIONS: readonly {
  readonly id: string;
  readonly label: LocalizedText;
}[] = [
  { id: "albuterol", label: { default: "Albuterol inhaler", es: "Inhalador de albuterol" } },
  { id: "lisinopril", label: { default: "Lisinopril 10 mg", es: "Lisinopril 10 mg" } },
  { id: "metformin", label: { default: "Metformin 500 mg", es: "Metformin 500 mg" } },
  { id: "levothyroxine", label: { default: "Levothyroxine 75 mcg", es: "Levothyroxine 75 mcg" } },
  { id: "atorvastatin", label: { default: "Atorvastatin 20 mg", es: "Atorvastatin 20 mg" } },
  { id: "sumatriptan", label: { default: "Sumatriptan 50 mg", es: "Sumatriptan 50 mg" } },
  { id: "sertraline", label: { default: "Sertraline 50 mg", es: "Sertraline 50 mg" } },
];

/* ── the derived summary ────────────────────────────────────────────────────── */

/**
 * Everything the summary says that is not a name, a place or a number.
 *
 * It lives here rather than in the definition because the visitor can edit the
 * definition on `/configure`: a stored copy without these strings would leave the
 * panel beside the form blank. It lives here rather than in the page's own string
 * table because it belongs to the derivation — `visitSummaryFor` is what decides
 * which of the four estimate lines applies, and an e2e spec can import both
 * without a browser.
 */
const SUMMARY_TEXT = {
  estimatePrompt: {
    default: "Pick a reason and how you are paying, and we will estimate it.",
    es: "Elija un motivo y cómo va a pagar, y le daremos un estimado.",
  },
  selfPay: {
    default: "Self-pay, due at check-in. No claim is filed.",
    es: "Pago directo, al registrarse. No se presenta ningún reclamo al seguro.",
  },
  // `{plan}` is the plan's own name, which is a proper noun in both languages.
  coveredInFull: {
    default: "{plan} covers this visit in full. Nothing due at check-in.",
    es: "{plan} cubre esta visita por completo. No hay nada que pagar al registrarse.",
  },
  copay: {
    default: "Your {plan} copay for this visit. Anything beyond it is billed to the plan.",
    es: "Su copago de {plan} para esta visita. Lo demás se le factura al plan.",
  },
  anyDay: { default: "any day", es: "cualquier día" },
  anyTime: { default: "any time", es: "a cualquier hora" },
  dayJoin: { default: " or ", es: " o " },
  photoId: { default: "A photo ID", es: "Una identificación con foto" },
  insuranceCard: { default: "Your insurance card", es: "Su tarjeta del seguro" },
  medicationList: {
    default: "A list of your current medications and doses",
    es: "Una lista de sus medicamentos actuales y sus dosis",
  },
  previousRecords: {
    default: "Records or immunizations from your previous clinic, if you have them",
    es: "Los expedientes o las vacunas de su clínica anterior, si los tiene",
  },
  homeReadings: {
    default: "Any home blood-pressure or glucose readings",
    es: "Las lecturas de presión arterial o de glucosa que haya tomado en casa",
  },
  triedMedications: {
    default: "Names of any medications you have tried before",
    es: "Los nombres de los medicamentos que haya tomado antes",
  },
  paymentCard: {
    default: "A card for payment at check-in",
    es: "Una tarjeta para pagar al registrarse",
  },
} as const satisfies Record<string, LocalizedText>;

export interface VisitSummary {
  readonly started: boolean;
  readonly reason: VisitReason | undefined;
  readonly location: ClinicLocation | undefined;
  readonly provider: Provider | undefined;
  readonly plan: HealthPlan | undefined;
  readonly selfPay: boolean;
  /** Estimated out-of-pocket cost for the visit, or null when unknown. */
  readonly estimate: number | null;
  readonly estimateLabel: string;
  readonly whenText: string;
  readonly newPatient: boolean;
  readonly urgent: boolean;
  readonly referralNeeded: boolean;
  /** What to bring, adapted to the answers. */
  readonly bring: readonly string[];
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/**
 * Turns an appointment request into the summary the page shows beside the form.
 *
 * Pure function of `data` and the locale, called on every answer change; the page
 * memoises it. The cost estimate is the line that matters — "what will this visit
 * cost me" is the question every US patient is actually asking, and answering it
 * from the plan and the reason they just picked is worth more than any hero image.
 *
 * The locale defaults to English so a caller that has none (a test, a script)
 * keeps the behaviour this function always had.
 */
export function visitSummaryFor(data: SurveyData, locale: ClinicLocale = "en"): VisitSummary {
  const say = (text: LocalizedText) => textFor(text, locale);

  const reason = getVisitReason(typeof data.visitReason === "string" ? data.visitReason : "");
  const location = getLocation(typeof data.location === "string" ? data.location : "");
  const providerId = typeof data.provider === "string" ? data.provider : "";
  const provider = providerId === "any" ? undefined : getProvider(providerId);
  const selfPay = data.coverage === "selfPay";
  const plan = selfPay ? undefined : getPlan(typeof data.healthPlan === "string" ? data.healthPlan : "");
  const newPatient = data.newPatient === true;
  const urgent = reason?.id === "urgentCare" || data.timeframe === "asap";

  const days = asArray(data.preferredDays);
  const timeChoice = typeof data.preferredTime === "string" ? data.preferredTime : "";
  const time = PREFERRED_TIMES.find((entry) => entry.value === timeChoice);

  const started = Boolean(
    reason || location || providerId || data.coverage || days.length > 0 || timeChoice,
  );

  let estimate: number | null = null;
  let estimateLabel = say(SUMMARY_TEXT.estimatePrompt);

  if (selfPay && reason) {
    estimate =
      reason.id === "wellness"
        ? SELF_PAY_PRICES.wellness
        : reason.category === "urgent"
          ? SELF_PAY_PRICES.urgent
          : reason.id === "behavioral"
            ? SELF_PAY_PRICES.behavioral
            : SELF_PAY_PRICES.standard;
    estimateLabel = say(SUMMARY_TEXT.selfPay);
  } else if (plan && reason) {
    estimate =
      reason.category === "urgent"
        ? plan.copayUrgent
        : reason.category === "specialist"
          ? plan.copaySpecialist
          : plan.copayPrimary;
    estimateLabel = say(
      estimate === 0 ? SUMMARY_TEXT.coveredInFull : SUMMARY_TEXT.copay,
    ).replace("{plan}", plan.name);
  }

  const whenText = (() => {
    // The day names the patient reads; the answers themselves stay English.
    const dayNames = days.map((day) => {
      const entry = PREFERRED_DAYS.find((candidate) => candidate.value === day);
      return entry ? say(entry.text) : day;
    });
    const dayPart =
      dayNames.length === 0
        ? say(SUMMARY_TEXT.anyDay)
        : dayNames.length === 1
          ? dayNames[0]
          : `${dayNames.slice(0, -1).join(", ")}${say(SUMMARY_TEXT.dayJoin)}${
              dayNames[dayNames.length - 1]
            }`;
    const timePart = time?.range ? say(time.range) : say(SUMMARY_TEXT.anyTime);
    return `${dayPart}, ${timePart}`;
  })();

  const bring: string[] = [say(SUMMARY_TEXT.photoId)];
  if (!selfPay) bring.push(say(SUMMARY_TEXT.insuranceCard));
  if (newPatient) {
    bring.push(say(SUMMARY_TEXT.medicationList));
    bring.push(say(SUMMARY_TEXT.previousRecords));
  }
  if (reason?.id === "wellness") bring.push(say(SUMMARY_TEXT.homeReadings));
  if (reason?.id === "behavioral") bring.push(say(SUMMARY_TEXT.triedMedications));
  if (selfPay) bring.push(say(SUMMARY_TEXT.paymentCard));

  return {
    started,
    reason,
    location,
    provider,
    plan,
    selfPay,
    estimate,
    estimateLabel,
    whenText,
    newPatient,
    urgent,
    referralNeeded: Boolean(plan?.referralRequired && reason?.category === "specialist"),
    bring,
  };
}

/**
 * Dollars, in the visitor's language.
 *
 * `es-US` is US Spanish, which puts the sign in front exactly as `en-US` does —
 * `$35`, not `35 US$`. That is checked in `clinic-locale.spec.ts`, because it is
 * a property of the runtime's ICU data rather than of this code.
 */
export function formatDollars(amount: number, locale: ClinicLocale = "en"): string {
  return amount.toLocaleString(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
