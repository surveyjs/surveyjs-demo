import {
  CHART_CONDITIONS,
  CHART_MEDICATIONS,
  CLINIC_LOCATIONS,
  HEALTH_PLANS,
  PROVIDERS,
} from "./clinic-info";
import type { SurveyData, SurveyJSON } from "./types";

/**
 * The patient chart, as the clinic's back office edits it.
 *
 * Two definitions run this demo and it is worth being clear about which is
 * which. `clinic-visit.ts` is the **public appointment form** — the survey a
 * patient fills in on the clinic's website. This one is the **record behind it**:
 * what the practice already knows, edited by staff in the admin, and handed to
 * the appointment form as `user_…` variables, one per field (`variables/patient.ts`).
 *
 * So the same library renders both sides of the story, and the admin needed no
 * bespoke form code: the screen where a nurse corrects a phone number is a
 * SurveyJS survey too. The shape follows SurveyJS's own patient-registration
 * template — personal details, contact, emergency contact, insurance — with the
 * part that template leaves out and a scheduler actually needs: the history.
 *
 * Every name here is a key the appointment form may read as `{user_something}`,
 * which is why they are camelCase rather than the template's kebab-case, and why
 * renaming one changes what that form can personalise.
 */

const LANGUAGES = [
  { value: "en", text: "English" },
  { value: "es", text: "Spanish" },
  { value: "vi", text: "Vietnamese" },
  { value: "ru", text: "Russian" },
  { value: "zh", text: "Mandarin" },
] as const;

const RELATIONSHIPS = [
  { value: "spouse", text: "Spouse or partner" },
  { value: "parent", text: "Parent" },
  { value: "child", text: "Adult child" },
  { value: "sibling", text: "Sibling" },
  { value: "friend", text: "Friend" },
] as const;

const FAMILY_HISTORY = [
  { value: "heart", text: "Heart disease" },
  { value: "diabetes", text: "Diabetes" },
  { value: "cancer", text: "Cancer" },
  { value: "stroke", text: "Stroke" },
  { value: "asthma", text: "Asthma" },
  { value: "mental", text: "Mental health condition" },
] as const;

/** The languages the appointment form can be told to expect. */
export const PATIENT_LANGUAGES = LANGUAGES;

export const patientRecordJson: SurveyJSON = {
  title: "Patient record",
  description:
    "What the practice already knows. The appointment form on the website reads this as {user_…}, so what is filled in here is what a patient never has to type.",
  showQuestionNumbers: "off",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  questionsOnPageMode: "singlePage",
  showNavigationButtons: "none",
  pages: [
    {
      name: "record",
      elements: [
        {
          type: "boolean",
          name: "isNewPatient",
          title: "First visit to Ridgeline?",
          description:
            "What the website reads to decide whether this patient is asked the long version of the form.",
          labelTrue: "Yes, new patient",
          labelFalse: "No, established patient",
        },
        {
          type: "panel",
          name: "personal",
          title: "Personal information",
          elements: [
            { type: "text", name: "firstName", title: "Legal first name", isRequired: true },
            {
              type: "text",
              name: "lastName",
              title: "Last name",
              isRequired: true,
              startWithNewLine: false,
            },
            { type: "text", name: "preferredName", title: "Preferred name" },
            {
              type: "text",
              name: "dateOfBirth",
              title: "Date of birth",
              inputType: "date",
              startWithNewLine: false,
            },
            {
              type: "dropdown",
              name: "gender",
              title: "Sex assigned at birth",
              choices: [
                { value: "female", text: "Female" },
                { value: "male", text: "Male" },
                { value: "intersex", text: "Intersex" },
              ],
            },
            {
              type: "dropdown",
              name: "maritalStatus",
              title: "Marital status",
              startWithNewLine: false,
              choices: [
                { value: "single", text: "Single" },
                { value: "married", text: "Married" },
                { value: "widowed", text: "Widowed" },
                { value: "divorced", text: "Divorced" },
                { value: "separated", text: "Separated" },
              ],
            },
          ],
        },
        {
          type: "panel",
          name: "contact",
          title: "Contact information",
          elements: [
            {
              type: "text",
              name: "phone",
              title: "Mobile phone",
              inputType: "tel",
              maskType: "pattern",
              // Without this survey-core keeps the digits alone, and the record
              // would not read back the way it was typed.
              maskSettings: { pattern: "(999) 999-9999", saveMaskedValue: true },
            },
            {
              type: "text",
              name: "email",
              title: "Email",
              inputType: "email",
              startWithNewLine: false,
            },
            { type: "text", name: "address", title: "Address" },
            {
              type: "text",
              name: "apartment",
              title: "Apartment #",
              startWithNewLine: false,
            },
            { type: "text", name: "city", title: "City" },
            { type: "text", name: "state", title: "State", startWithNewLine: false },
            { type: "text", name: "zip", title: "ZIP code", startWithNewLine: false },
            {
              type: "dropdown",
              name: "preferredLanguage",
              title: "Preferred language",
              choices: [...LANGUAGES],
            },
            {
              type: "boolean",
              name: "needsInterpreter",
              title: "Interpreter on the record?",
              startWithNewLine: false,
              labelTrue: "Yes",
              labelFalse: "No",
            },
          ],
        },
        {
          type: "panel",
          name: "emergency",
          title: "Emergency contact",
          elements: [
            { type: "text", name: "emergencyName", title: "Full name" },
            {
              type: "dropdown",
              name: "emergencyRelationship",
              title: "Relationship",
              startWithNewLine: false,
              choices: [...RELATIONSHIPS],
            },
            {
              type: "text",
              name: "emergencyPhone",
              title: "Phone",
              inputType: "tel",
              maskType: "pattern",
              maskSettings: { pattern: "(999) 999-9999", saveMaskedValue: true },
            },
          ],
        },
        {
          type: "panel",
          name: "onFile",
          title: "On file at the practice",
          elements: [
            { type: "text", name: "mrn", title: "Medical record number" },
            {
              type: "text",
              name: "lastVisit",
              title: "Last seen",
              startWithNewLine: false,
            },
            {
              type: "dropdown",
              name: "homeLocation",
              title: "Usual office",
              choices: CLINIC_LOCATIONS.map((location) => ({
                value: location.id,
                text: location.name,
              })),
            },
            {
              type: "dropdown",
              name: "primaryProvider",
              title: "Primary clinician",
              startWithNewLine: false,
              choices: PROVIDERS.map((provider) => ({
                value: provider.id,
                text: `${provider.name}, ${provider.credential}`,
              })),
            },
          ],
        },
        {
          type: "panel",
          name: "insurance",
          title: "Insurance",
          elements: [
            {
              type: "dropdown",
              name: "healthPlanOnFile",
              title: "Plan on file",
              choices: HEALTH_PLANS.map((plan) => ({ value: plan.id, text: plan.name })),
            },
            {
              type: "text",
              name: "memberIdOnFile",
              title: "Member ID",
              description: "Leave this blank and the appointment form asks for a card.",
              startWithNewLine: false,
            },
            { type: "text", name: "groupNumberOnFile", title: "Group number" },
            {
              type: "radiogroup",
              name: "policyholder",
              title: "Policyholder",
              colCount: 2,
              choices: [
                { value: "self", text: "The patient" },
                { value: "other", text: "Somebody else" },
              ],
            },
            {
              type: "text",
              name: "policyholderName",
              title: "Policyholder's name",
              visibleIf: "{policyholder} = 'other'",
            },
            {
              type: "dropdown",
              name: "policyholderRelationship",
              title: "Relationship to the patient",
              startWithNewLine: false,
              visibleIf: "{policyholder} = 'other'",
              choices: [...RELATIONSHIPS],
            },
          ],
        },
        {
          type: "panel",
          name: "history",
          title: "Medical history",
          description:
            "The part the appointment form is built from: it offers this patient's own diagnoses and this patient's own medications, choice by choice.",
          elements: [
            {
              type: "checkbox",
              name: "conditions",
              title: "Problem list",
              description: "The website's follow-up question offers exactly these.",
              colCount: 3,
              choices: CHART_CONDITIONS.map((condition) => ({
                value: condition.id,
                text: condition.label,
              })),
            },
            {
              type: "comment",
              name: "otherConditions",
              title: "Anything else on the problem list",
              rows: 2,
            },
            {
              type: "checkbox",
              name: "medications",
              title: "Current medications",
              description: "And these are what the refill question can offer.",
              colCount: 2,
              choices: CHART_MEDICATIONS.map((medication) => ({
                value: medication.id,
                text: medication.label,
              })),
            },
            {
              type: "boolean",
              name: "openRefills",
              title: "Refills available?",
              labelTrue: "Yes",
              labelFalse: "No",
            },
            {
              type: "comment",
              name: "allergies",
              title: "Allergies",
              description: "Drug, food or environmental — and the reaction.",
              rows: 2,
            },
            {
              type: "matrixdynamic",
              name: "surgeries",
              title: "Surgeries and hospital stays",
              rowCount: 0,
              addRowText: "Add one",
              columns: [
                { name: "procedure", title: "Procedure", cellType: "text" },
                { name: "year", title: "Year", cellType: "text", inputType: "number" },
                { name: "notes", title: "Notes", cellType: "text" },
              ],
            },
            {
              type: "checkbox",
              name: "familyHistory",
              title: "Family history",
              colCount: 3,
              choices: [...FAMILY_HISTORY],
            },
            {
              type: "dropdown",
              name: "smoking",
              title: "Tobacco use",
              choices: [
                { value: "never", text: "Never" },
                { value: "former", text: "Former" },
                { value: "current", text: "Current" },
              ],
            },
            {
              type: "dropdown",
              name: "alcohol",
              title: "Alcohol use",
              startWithNewLine: false,
              choices: [
                { value: "none", text: "None" },
                { value: "occasional", text: "Occasional" },
                { value: "weekly", text: "Weekly" },
                { value: "daily", text: "Daily" },
              ],
            },
            {
              type: "comment",
              name: "chartNotes",
              title: "Notes for the care team",
              rows: 2,
            },
          ],
        },
      ],
    },
  ],
};

/**
 * The patients the demo ships with.
 *
 * Three on purpose, because the dropdown in the embedded site is the argument:
 * one established patient with a full chart, one on Medicare whose copay and
 * referral rules differ, and one first-timer for whom the very same definition
 * renders a longer form. Anyone can add a fourth in the admin.
 */
export const CLINIC_PATIENTS: readonly { readonly id: string; readonly data: SurveyData }[] = [
  {
    id: "delgado",
    data: {
      isNewPatient: false,
      firstName: "Maria",
      lastName: "Delgado",
      preferredName: "Maria",
      dateOfBirth: "1984-03-12",
      gender: "female",
      maritalStatus: "married",
      phone: "(503) 555-0148",
      email: "maria.delgado@example.com",
      address: "1842 SE Halsey St",
      apartment: "4B",
      city: "Portland",
      state: "OR",
      zip: "97232",
      preferredLanguage: "es",
      needsInterpreter: true,
      emergencyName: "Luis Delgado",
      emergencyRelationship: "spouse",
      emergencyPhone: "(503) 555-0192",
      mrn: "RFH-04812",
      lastVisit: "18 April 2026",
      homeLocation: "westbridge",
      primaryProvider: "navarro",
      healthPlanOnFile: "blueharbor",
      memberIdOnFile: "BH-88213041",
      groupNumberOnFile: "NW-4471",
      policyholder: "self",
      conditions: ["asthma", "hypertension"],
      medications: ["albuterol", "lisinopril"],
      openRefills: true,
      allergies: "Penicillin — hives.",
      familyHistory: ["heart", "diabetes"],
      smoking: "never",
      alcohol: "occasional",
      surgeries: [{ procedure: "Appendectomy", year: "2009" }],
    },
  },
  {
    id: "okafor",
    data: {
      isNewPatient: false,
      firstName: "Daniel",
      lastName: "Okafor",
      preferredName: "Danny",
      dateOfBirth: "1956-11-02",
      gender: "male",
      maritalStatus: "widowed",
      phone: "(503) 555-0311",
      email: "d.okafor@example.com",
      address: "77 NW Marlowe Ave",
      city: "Portland",
      state: "OR",
      zip: "97210",
      preferredLanguage: "en",
      needsInterpreter: false,
      emergencyName: "Ada Okafor",
      emergencyRelationship: "child",
      emergencyPhone: "(503) 555-0327",
      mrn: "RFH-01197",
      lastVisit: "3 February 2026",
      homeLocation: "marlowe",
      primaryProvider: "weiss",
      healthPlanOnFile: "statecare",
      memberIdOnFile: "SC-4410287",
      groupNumberOnFile: "",
      policyholder: "self",
      conditions: ["diabetes", "cholesterol", "arthritis"],
      medications: ["metformin", "atorvastatin"],
      openRefills: true,
      allergies: "None on record.",
      familyHistory: ["stroke"],
      smoking: "former",
      alcohol: "none",
      chartNotes: "Prefers morning appointments; uses a cane.",
    },
  },
  {
    id: "raman",
    data: {
      isNewPatient: true,
      firstName: "Priya",
      lastName: "Raman",
      preferredName: "Priya",
      dateOfBirth: "1997-07-24",
      gender: "female",
      maritalStatus: "single",
      phone: "(971) 555-0264",
      email: "priya.raman@example.com",
      address: "512 N Cedar Park Rd",
      city: "Portland",
      state: "OR",
      zip: "97217",
      preferredLanguage: "en",
      needsInterpreter: false,
      emergencyName: "Anil Raman",
      emergencyRelationship: "parent",
      emergencyPhone: "(971) 555-0288",
    },
  },
];
